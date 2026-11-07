import { addRecipeToMenu } from "@/app/(app)/menus/actions";
import { afterSaveUrl } from "@/lib/menu-return";

/**
 * Adresse à ouvrir après la création d'une recette (US-MEN-01, reprend la décision 064) :
 * - venue d'un menu : la recette y est d'abord ajoutée (côté serveur), puis on revient
 *   au menu ;
 * - sinon, ou si l'ajout au menu échoue : la fiche de la recette.
 */
export async function urlAfterCreate(
  recipeId: string,
  menuId: string | null,
  recipeQuery = "",
): Promise<string> {
  if (menuId) {
    const added = await addRecipeToMenu(menuId, recipeId);
    if (added.ok) return afterSaveUrl(recipeId, menuId);
  }
  return afterSaveUrl(recipeId, null, recipeQuery);
}
