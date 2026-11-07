import { THEME_COLORS, THEME_STORAGE_KEY, themeAttribute, type Theme } from "@/lib/theme";

/**
 * Applique un thème dans le navigateur : attribut data-theme de <html>, choix gardé sur
 * l'appareil, et couleur de la barre d'état du téléphone.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const attribute = themeAttribute(theme);
  if (attribute) root.dataset.theme = attribute;
  else delete root.dataset.theme;

  try {
    if (attribute) localStorage.setItem(THEME_STORAGE_KEY, attribute);
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Stockage indisponible (navigation privée…) : le thème vaut pour cette visite
  }

  // Barre d'état : les deux balises <meta name="theme-color"> (clair / sombre) prennent la
  // couleur du thème choisi ; Automatique leur rend leur couleur d'origine
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const original = meta.media.includes("dark") ? THEME_COLORS.dark : THEME_COLORS.light;
    meta.content = attribute ? THEME_COLORS[attribute] : original;
  });
}
