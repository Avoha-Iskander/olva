import { addRecipeToList } from "@/app/(app)/listes/actions";
import { afterSaveUrl, type ListReturn } from "@/lib/list-return";

/**
 * Adresse à ouvrir après la création d'une recette (décision 064) :
 * - venue de l'étape 1 d'une liste : la recette y est d'abord cochée (côté serveur), puis
 *   on revient à cette étape ;
 * - sinon, ou si l'ajout à la liste échoue : la fiche de la recette.
 */
export async function urlAfterCreate(
  recipeId: string,
  list: ListReturn | null,
  recipeQuery = "",
): Promise<string> {
  if (list) {
    const added = await addRecipeToList(list, recipeId);
    if (added.ok) return afterSaveUrl(recipeId, added.listId);
  }
  return afterSaveUrl(recipeId, null, recipeQuery);
}
