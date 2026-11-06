import type { MetadataRoute } from "next";

/**
 * Fiche d'installation de l'app (PWA) : ce que le téléphone utilise quand on fait
 * « Ajouter à l'écran d'accueil » — nom, icône, couleurs, page d'ouverture (l'accueil,
 * décision 053) et affichage plein écran, sans barre d'adresse.
 * Next.js la sert à l'adresse /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Olva — recettes et listes de courses",
    short_name: "Olva",
    description: "Toutes vos recettes à un endroit, vos listes de courses en 2 minutes.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2f6fd6",
    // Android : Olva apparaît dans le menu « Partager » (navigateur, Instagram…) une fois
    // installée ; le lien partagé arrive sur /recettes/partage (décision 065)
    share_target: {
      action: "/recettes/partage",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // « maskable » : le téléphone peut la rogner (cercle, carré arrondi) sans couper le logo
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
