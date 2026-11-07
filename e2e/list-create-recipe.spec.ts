import { expect, test } from "./fixtures";
import { createMenu, deleteMenu } from "./helpers";

/**
 * « Créer une recette » depuis un menu (US-MEN-01, reprend la décision 064) : la recette
 * créée à la main revient déjà ajoutée au menu. Menu et recette sont supprimés à la fin :
 * le compte de test reste propre.
 */
test("créer une recette depuis un menu : elle revient ajoutée", async ({ page }) => {
  const title = `E2E Salade ${Date.now()}`;
  let menuId = "";

  await test.step("partir du menu vers « Saisir à la main »", async () => {
    menuId = await createMenu(page);
    await page.getByRole("button", { name: "Créer une recette" }).click();
    await page.getByRole("button", { name: "Saisir à la main" }).click();
    await expect(page).toHaveURL(new RegExp(`/recettes/nouvelle\\?menu=${menuId}$`));
  });

  await test.step("saisir et enregistrer la recette", async () => {
    await page.getByLabel("Titre").fill(title);
    await page.getByRole("combobox").first().click();
    await page.getByPlaceholder("Rechercher (ex. tomate)").fill("tomate");
    await page
      .getByRole("listbox")
      .getByRole("option")
      .filter({ hasNotText: /Créer/ })
      .first()
      .click();
    await page.getByLabel("Ingrédient 1 : quantité (vide = au goût)").fill("2");
    await page.getByRole("textbox", { name: "Étape 1", exact: true }).fill("Couper les tomates.");
    await page.getByRole("button", { name: "Enregistrer" }).click();
  });

  await test.step("retour au menu : la recette est ajoutée", async () => {
    await expect(page).toHaveURL(new RegExp(`/menus/${menuId}\\?ajout=[0-9a-f-]{36}$`));
    await expect(page.getByRole("status").filter({ hasText: title })).toBeVisible();
    await expect(page.getByRole("region", { name: /Au menu/ }).getByText(title)).toBeVisible();
  });

  await test.step("ranger : supprimer le menu puis la recette", async () => {
    await deleteMenu(page, menuId);
    await page.goto("/recettes");
    await page.getByRole("link").filter({ hasText: title }).filter({ visible: true }).click();
    await page.getByRole("link", { name: "Modifier", exact: true }).click();
    await page.getByRole("button", { name: "Supprimer la recette…" }).click();
    await page.getByRole("button", { name: "Oui, supprimer" }).click();
    await expect(page).toHaveURL(/\/recettes$/);
  });
});
