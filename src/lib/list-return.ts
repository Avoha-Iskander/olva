/**
 * « Créer une recette » depuis l'étape 1 d'une liste (décision 064) : on part créer la
 * recette en gardant en mémoire la liste d'origine (paramètre « liste » dans l'adresse),
 * puis on y revient avec la nouvelle recette cochée (paramètre « ajout »).
 * Fonctions pures : elles ne font que lire et fabriquer des adresses.
 */

/** Liste d'origine : l'identifiant d'une liste, ou « nouvelle » (pas encore créée). */
export type ListReturn = string;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un identifiant de recette ou de liste reçu dans l'adresse, s'il est bien formé. */
export function parseId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

/** Le paramètre « liste » reçu dans l'adresse : accepté seulement s'il est bien formé. */
export function parseListReturn(value: unknown): ListReturn | null {
  return value === "nouvelle" ? value : parseId(value);
}

/** Adresse d'un écran de création qui reviendra à cette liste : « /recettes/lien?liste=… ». */
export function withListReturn(path: string, list: ListReturn | null): string {
  return list ? `${path}?liste=${encodeURIComponent(list)}` : path;
}

/**
 * Où aller une fois la recette enregistrée : retour à l'étape 1 de la liste, recette
 * cochée ; sinon (création ordinaire) la fiche, avec ses paramètres éventuels.
 */
export function afterSaveUrl(recipeId: string, list: ListReturn | null, recipeQuery = ""): string {
  if (list === "nouvelle") return `/nouvelle-liste?ajout=${recipeId}`;
  if (list) return `/listes/${list}/recettes?ajout=${recipeId}`;
  return `/recettes/${recipeId}${recipeQuery}`;
}
