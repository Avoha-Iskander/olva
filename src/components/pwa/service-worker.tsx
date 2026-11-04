"use client";

import { useEffect } from "react";

/**
 * Installe le service worker (public/sw.js) au premier chargement.
 * En production et sur les aperçus seulement : en développement local (`npm run dev`),
 * un cache rendrait les modifications de code invisibles.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Échec sans gravité : l'app fonctionne normalement, seulement sans le hors ligne
    });
  }, []);
  return null;
}
