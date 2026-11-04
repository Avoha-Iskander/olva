/*
 * Service worker d'Olva (lot 6, décision 053) — écrit à la main, sans bibliothèque.
 *
 * Un service worker est un petit programme que le navigateur installe à côté de l'app.
 * Il se place entre l'app et le réseau : chaque demande de fichier ou de page passe par
 * lui. Il continue d'exister sans réseau, ce qui permet d'ouvrir l'app hors ligne.
 *
 * Stratégies :
 * - fichiers de l'app (/_next/static/, icônes) : cache d'abord. Leur nom change à chaque
 *   version (empreinte), un fichier en cache n'est donc jamais périmé ;
 * - pages : réseau d'abord ; la réponse est gardée en cache, et resservie seulement si
 *   le réseau manque. Une page jamais ouverte → page « Vous êtes hors ligne » ;
 * - tout le reste (données Supabase, actions serveur, API) : jamais touché.
 *
 * Changer VERSION efface les anciens caches à l'activation.
 */
const VERSION = "v1";
const STATIC_CACHE = `olva-static-${VERSION}`;
const PAGES_CACHE = `olva-pages-${VERSION}`;
const OFFLINE_PAGE = "/hors-ligne";

// Installation : la page de secours est mise en cache tout de suite
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_PAGE, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

// Activation : suppression des caches d'une ancienne version, puis prise en main des onglets
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith("olva-") && n !== STATIC_CACHE && n !== PAGES_CACHE)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Fichier de l'app dont le nom change à chaque version : cache d'abord. */
function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

/** Ouverture d'une page (navigation), sans action serveur ni préchargement. */
function isPageNavigation(request) {
  return request.mode === "navigate" && request.method === "GET";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Seulement notre propre site, en lecture
  if (url.origin !== self.location.origin || request.method !== "GET") return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (isPageNavigation(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES_CACHE);
        try {
          const response = await fetch(request);
          // Seules les vraies pages sont gardées (pas une redirection vers /connexion)
          if (response.ok && !response.redirected) cache.put(request, response.clone());
          return response;
        } catch {
          // Pas de réseau : la dernière version de la page, sinon la page de secours
          return (
            (await cache.match(request, { ignoreSearch: true })) ??
            (await cache.match(OFFLINE_PAGE)) ??
            Response.error()
          );
        }
      })(),
    );
  }
});

/**
 * Garder des pages pour le hors ligne, à la demande de l'app.
 * Pourquoi ? En passant d'une page à l'autre, Next.js ne charge que les DONNÉES de la page
 * suivante, pas la page entière : le service worker ne la verrait jamais passer. L'écran
 * de courses lui demande donc de télécharger et garder sa propre page (et l'accueil),
 * avec les fichiers de code qu'elle utilise (repérés dans son HTML).
 */
async function keepPages(urls) {
  const pages = await caches.open(PAGES_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  let kept = 0;
  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok || response.redirected) continue;
      const html = await response.clone().text();
      await pages.put(url, response);
      kept++;
      // Fichiers de code, styles et polices de la page : /_next/static/…
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
      await Promise.all(
        assets.map(async (asset) => {
          if (await statics.match(asset)) return;
          try {
            await statics.add(asset);
          } catch {
            // un fichier manquant n'empêche pas de garder les autres
          }
        }),
      );
    } catch {
      // pas de réseau : rien à garder pour l'instant
    }
  }
  return kept;
}

self.addEventListener("message", (event) => {
  // Déconnexion : les pages gardées sont effacées
  if (event.data === "effacer-cache") {
    event.waitUntil(caches.delete(PAGES_CACHE));
    return;
  }
  // Demande de l'écran de courses ; réponse quand c'est fait
  if (event.data && event.data.type === "garder-pages" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      keepPages(event.data.urls).then((kept) =>
        event.source?.postMessage({ type: "pages-gardees", kept }),
      ),
    );
  }
});
