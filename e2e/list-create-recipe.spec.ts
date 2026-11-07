import { expect, test } from "./fixtures";
import { createMenu, createRecipeFromMenu, deleteMenu, deleteRecipe } from "./helpers";

/**
 * « Créer une recette » depuis un menu (US-MEN-01, reprend la décision 064) : la recette
 * créée à la main revient déjà ajoutée au menu. Menu et recette sont supprimés à la fin :
 * le compte de test reste propre.
 */
test("créer une recette depuis un menu : elle revient ajoutée", async ({ page }) => {
  const title = `E2E Salade ${Date.now()}`;
  const menuId = await createMenu(page);

  await createRecipeFromMenu(page, menuId, title);
  await expect(page.getByRole("status").filter({ hasText: title })).toBeVisible();
  await expect(page.getByRole("region", { name: /Au menu/ }).getByText(title)).toBeVisible();

  await deleteMenu(page, menuId);
  await deleteRecipe(page, title);
});
