import { expect, test } from "./fixtures";
import { createRecipeFromMenu, deleteMenu, deleteRecipe, openNewMenu } from "./helpers";

/**
 * « Créer une recette » depuis le formulaire d'un nouveau menu (US-MEN-01, reprend la
 * décision 064) : le menu est enregistré au départ, et la recette revient déjà ajoutée.
 * Menu et recette sont supprimés à la fin : le compte de test reste propre.
 */
test("créer une recette depuis un nouveau menu : elle revient ajoutée", async ({ page }) => {
  const title = `E2E Salade ${Date.now()}`;
  await openNewMenu(page);

  const menuId = await createRecipeFromMenu(page, title);
  await expect(page.getByRole("status").filter({ hasText: title })).toBeVisible();
  await expect(page.getByRole("region", { name: /Au menu/ }).getByText(title)).toBeVisible();

  await deleteMenu(page, menuId);
  await deleteRecipe(page, title);
});
