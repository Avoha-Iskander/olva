import { expect, test } from "./fixtures";
import { deleteList } from "./helpers";

/**
 * « Créer une recette » depuis l'étape 1 d'une nouvelle liste (décision 064) : la recette
 * créée à la main revient déjà cochée dans la liste. Liste et recette sont supprimées à
 * la fin : le compte de test reste propre.
 */
test("créer une recette depuis une nouvelle liste : elle revient cochée", async ({ page }) => {
  const title = `E2E Salade ${Date.now()}`;
  let listId = "";

  await test.step("partir de l'étape 1 vers « Saisir à la main »", async () => {
    await page.goto("/nouvelle-liste");
    await page.getByRole("button", { name: "Créer une recette" }).click();
    await page.getByRole("button", { name: "Saisir à la main" }).click();
    await expect(page).toHaveURL(/\/recettes\/nouvelle\?liste=nouvelle$/);
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

  await test.step("retour à l'étape 1 : la liste est créée, la recette est cochée", async () => {
    await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}\/recettes\?ajout=[0-9a-f-]{36}$/);
    listId = new URL(page.url()).pathname.split("/")[2];
    await expect(page.getByRole("status").filter({ hasText: title })).toBeVisible();
    await expect(
      page.getByRole("region", { name: /Recettes choisies/ }).getByText(title),
    ).toBeVisible();
  });

  await test.step("ranger : supprimer la liste puis la recette", async () => {
    await deleteList(page, listId);
    await page.goto("/recettes");
    await page.getByRole("link").filter({ hasText: title }).filter({ visible: true }).click();
    await page.getByRole("link", { name: "Modifier", exact: true }).click();
    await page.getByRole("button", { name: "Supprimer la recette…" }).click();
    await page.getByRole("button", { name: "Oui, supprimer" }).click();
    await expect(page).toHaveURL(/\/recettes$/);
  });
});
