/**
 * Apparence (US-CPT-05, décision 070) : Automatique, Clair ou Sombre.
 * Le choix est rangé dans le profil (il suit la personne) ET sur l'appareil
 * (localStorage), pour s'appliquer dès l'ouverture, avant même la connexion ou hors ligne.
 * Fichier sans « use client » : utilisable côté serveur et côté navigateur.
 */

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  system: "Automatique",
  light: "Clair",
  dark: "Sombre",
};

/** Clé du choix gardé sur l'appareil. */
export const THEME_STORAGE_KEY = "olva-theme";

/** Couleur de la barre d'état du téléphone, selon le thème (même valeurs que le layout). */
export const THEME_COLORS = { light: "#ffffff", dark: "#141a26" } as const;

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** Valeur de l'attribut data-theme de <html> : rien pour Automatique (suit le téléphone). */
export function themeAttribute(theme: Theme): "light" | "dark" | null {
  return theme === "system" ? null : theme;
}

/**
 * Petit script lancé AVANT l'affichage de la page (dans <head>) : il pose le thème gardé
 * sur l'appareil, pour éviter un « flash » clair quand on a choisi Sombre (et inversement).
 * Écrit en JavaScript simple, en texte : il s'exécute avant React.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;
