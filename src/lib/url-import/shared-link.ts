/**
 * Partage vers Olva (décision 065) : ce que reçoit Olva quand on « partage » depuis un
 * navigateur, Instagram ou un Raccourci iPhone. Selon l'appli, le lien arrive seul (url),
 * au milieu d'un texte (« Regarde cette recette https://… »), ou il n'y en a pas (texte
 * d'une note). Fonctions pures.
 */

/** Paramètres de suivi ajoutés au partage, sans rapport avec la recette. */
const TRACKING = /^(utm_\w+|igsh|igshid|fbclid|gclid|si|mc_\w+)$/i;

/** Le lien, sans paramètres de suivi : un même lien partagé deux fois reste identique. */
export function cleanSharedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** Premier lien trouvé dans un texte, sans la ponctuation qui le suit. */
export function findUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"«»]+/i);
  if (!match) return null;
  return cleanSharedUrl(match[0].replace(/[),.;:!?'’]+$/, ""));
}

export type SharedInput = { url: string } | { text: string } | null;

/**
 * Ce qu'on va lire : le lien s'il y en a un (dans url, puis text, puis title), sinon le
 * texte lui-même s'il est assez long pour contenir une recette, sinon rien.
 */
export function readSharedInput(shared: {
  url?: unknown;
  text?: unknown;
  title?: unknown;
}): SharedInput {
  const parts = [shared.url, shared.text, shared.title].map((p) =>
    typeof p === "string" ? p.trim() : "",
  );
  for (const part of parts) {
    const url = part && findUrl(part);
    if (url) return { url };
  }
  const text = [parts[2], parts[1]].filter(Boolean).join("\n\n").slice(0, 20000);
  return text.length >= 40 ? { text } : null;
}

/** Instagram ne laisse souvent pas lire ses publications sans connexion. */
export function isInstagram(url: string): boolean {
  try {
    return /(^|\.)instagram\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
