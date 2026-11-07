/**
 * « Créer une recette » depuis un menu (US-MEN-01, reprend la décision 064) : on part créer
 * la recette en gardant en mémoire le menu d'origine (paramètre « menu » dans l'adresse),
 * puis on y revient avec la nouvelle recette ajoutée (paramètre « ajout »).
 * Fonctions pures : elles ne font que lire et fabriquer des adresses.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un identifiant (recette, liste, menu) reçu dans l'adresse, s'il est bien formé. */
export function parseId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

/** Adresse d'un écran de création qui reviendra à ce menu : « /recettes/lien?menu=… ». */
export function withMenuReturn(path: string, menuId: string | null): string {
  return menuId ? `${path}?menu=${encodeURIComponent(menuId)}` : path;
}

/**
 * Où aller une fois la recette enregistrée : retour au formulaire du menu, recette ajoutée ;
 * sinon (création ordinaire) la fiche, avec ses paramètres éventuels.
 */
export function afterSaveUrl(recipeId: string, menuId: string | null, recipeQuery = ""): string {
  if (menuId) return `/menus/${menuId}/modifier?ajout=${recipeId}`;
  return `/recettes/${recipeId}${recipeQuery}`;
}
