import { expect, test } from "./fixtures";
import { deleteList } from "./helpers";

/**
 * Étape « Pré-liste » (US-LST-04, décision 074) : un article ajouté ponctuellement se range
 * dans son rayon, avec les articles de la pré-liste.
 */
test("un article ajouté se range dans son rayon", async ({ page }) => {
  await page.goto("/listes");
  await page.getByRole("button", { name: "Nouvelle", exact: true }).click();
  await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}\/pre-liste$/);
  const listId = new URL(page.url()).pathname.split("/")[2];

  // Le sélecteur n'a pas de nom accessible (rôle combobox) : on le repère par son texte
  await page.getByRole("combobox").filter({ hasText: "Autre chose" }).click();
  await page.getByPlaceholder("Rechercher (ex. tomate)").fill("Abricot");
  await page
    .getByRole("listbox")
    .getByRole("option", { name: /^Abricot/ })
    .first()
    .click();

  // La ligne « ajouté » est dans le bloc du rayon Fruits et légumes
  const aisle = page
    .getByRole("heading", { level: 3, name: /Fruits et légumes/i })
    .locator("xpath=following-sibling::ul[1]");
  await expect(aisle.getByRole("listitem").filter({ hasText: "Abricot" })).toContainText("ajouté");

  await deleteList(page, listId);
});
