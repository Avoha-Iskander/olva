/**
 * Lecture protégée d'une adresse web donnée par l'utilisateur (US-REC-07).
 * CÔTÉ SERVEUR UNIQUEMENT.
 *
 * Pourquoi des protections ? C'est NOTRE serveur qui va chercher l'adresse. Sans garde-fous,
 * quelqu'un pourrait lui faire lire une adresse interne (« http://192.168.1.1 », le réseau
 * de l'hébergeur…) : c'est une attaque appelée SSRF. On refuse donc :
 * - tout protocole autre que http/https, les identifiants dans l'adresse, les ports exotiques ;
 * - toute adresse qui mène à une IP privée, locale ou réservée (vérifié après résolution DNS,
 *   et à chaque redirection) ;
 * - les réponses trop longues ou trop lourdes.
 * Limite connue : entre notre vérification DNS et la connexion, le DNS pourrait changer
 * (« DNS rebinding »). Risque faible ici : l'app ne renvoie que la recette extraite.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Vrai si l'adresse IP est privée, locale ou réservée (jamais une page web publique). */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || // « ce réseau »
      a === 10 || // privé
      a === 127 || // la machine elle-même
      (a === 100 && b >= 64 && b <= 127) || // réseau partagé des opérateurs
      (a === 169 && b === 254) || // lien local (dont les métadonnées des hébergeurs cloud)
      (a === 172 && b >= 16 && b <= 31) || // privé
      (a === 192 && b === 168) || // privé
      (a === 192 && b === 0) || // réservé
      (a === 198 && (b === 18 || b === 19)) || // tests
      a >= 224 // multidiffusion et réservé
    );
  }
  if (version === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === "::" || v6 === "::1") return true;
    // Adresse IPv4 « habillée » en IPv6 (::ffff:10.0.0.1) : on vérifie l'IPv4
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      /^f[cd]/.test(v6) || // privé (fc00::/7)
      /^fe[89ab]/.test(v6) || // lien local (fe80::/10)
      v6.startsWith("ff") // multidiffusion
    );
  }
  return true; // pas une IP valide : on refuse
}

/**
 * Vérifie la forme d'une adresse saisie, sans réseau : http/https, pas d'identifiants,
 * port standard, pas de nom local ni d'IP privée écrite en clair. Renvoie l'URL ou null.
 */
export function parsePublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.replace(/^\[|\]$/g, ""); // [::1] → ::1
  if (!host.includes(".") && !isIP(host)) return null; // « localhost », « intranet »…
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return null;
  }
  if (isIP(host) && isPrivateAddress(host)) return null;
  return url;
}

/** Résout le nom de domaine et vérifie qu'AUCUNE de ses adresses n'est privée. */
async function resolvesToPublic(url: URL): Promise<boolean> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return !isPrivateAddress(host);
  try {
    const addresses = await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

export type SafeFetchResult =
  | { ok: true; body: Uint8Array; contentType: string; finalUrl: string }
  | {
      ok: false;
      reason: "invalid" | "blocked" | "timeout" | "too_large" | "http" | "type" | "network";
      contentType?: string; // type refusé (reason « type ») : utile pour expliquer l'échec
    };

/**
 * Télécharge une adresse publique avec des limites strictes.
 * Les redirections sont suivies À LA MAIN (3 au plus) pour revérifier chaque étape.
 */
export async function safeFetch(
  raw: string,
  options: { accept: (contentType: string) => boolean; maxBytes: number; timeoutMs: number },
): Promise<SafeFetchResult> {
  const first = parsePublicUrl(raw);
  if (!first) return { ok: false, reason: "invalid" };
  let url: URL = first;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    for (let hop = 0; hop <= 3; hop++) {
      if (!(await resolvesToPublic(url))) return { ok: false, reason: "blocked" };

      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // On se présente honnêtement, avec une langue française pour avoir la bonne version
          "User-Agent": "Mozilla/5.0 (compatible; Olva/1.0; lecture de recette)",
          Accept: "text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.5",
          "Accept-Language": "fr-FR,fr;q=0.9",
        },
      });

      // Redirection : on revérifie la nouvelle adresse avant de la suivre
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        const next = location ? parsePublicUrl(new URL(location, url).toString()) : null;
        if (!next) return { ok: false, reason: "blocked" };
        url = next;
        continue;
      }
      if (!response.ok || !response.body) return { ok: false, reason: "http" };

      const contentType = response.headers.get("content-type") ?? "";
      if (!options.accept(contentType)) return { ok: false, reason: "type", contentType };
      const announced = Number(response.headers.get("content-length") ?? 0);
      if (announced > options.maxBytes) return { ok: false, reason: "too_large" };

      // Lecture morceau par morceau : on s'arrête dès que la limite est dépassée
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > options.maxBytes) {
          await reader.cancel();
          return { ok: false, reason: "too_large" };
        }
        chunks.push(value);
      }
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return { ok: true, body, contentType, finalUrl: url.toString() };
    }
    return { ok: false, reason: "blocked" }; // trop de redirections
  } catch {
    // Délai dépassé (abandon volontaire) ou erreur réseau
    if (controller.signal.aborted) return { ok: false, reason: "timeout" };
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
