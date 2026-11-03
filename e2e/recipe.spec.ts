import { expect, test } from "./fixtures";

/**
 * Parcours « recette » complet : créer une recette à la main, la retrouver, la supprimer.
 * La recette est supprimée à la fin : le compte de test reste propre.
 * Un titre unique (date et heure) évite toute confusion avec un passage précédent.
 * Chaque étape est nommée : en cas d'échec, le journal dit laquelle a bloqué.
 */
test("créer, afficher puis supprimer une recette", async ({ page }) => {
  const title = `E2E Pâte à crêpes ${Date.now()}`;

  await test.step("ouvrir le formulaire et saisir le titre", async () => {
    await page.goto("/recettes/nouvelle");
    await page.getByLabel("Titre").fill(title);
  });

  await test.step("choisir l'ingrédient dans le catalogue", async () => {
    // On cherche « farine » et on prend le premier article proposé (pas la ligne « Créer … »)
    await page.getByRole("combobox").first().click();
    await page.getByPlaceholder("Rechercher (ex. tomate)").fill("farine");
    // Dans la liste de recherche du catalogue (et non dans le menu des unités, qui a aussi
    // des « options »)
    await page
      .getByRole("listbox")
      .getByRole("option")
      .filter({ hasNotText: /Créer/ })
      .first()
      .click();
  });

  await test.step("quantité, unité et étape", async () => {
    await page.getByLabel("Ingrédient 1 : quantité (vide = au goût)").fill("250");
    await page.getByLabel("Ingrédient 1 : unité").selectOption("g");
    await page.getByLabel("Étape 1").fill("Mélanger la farine et le lait.");
  });

  await test.step("enregistrer et voir la fiche", async () => {
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/recettes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("Mélanger la farine et le lait.")).toBeVisible();
  });

  // La carte existe en deux versions (mobile et ordinateur) : on prend celle qui est visible
  const card = page.getByRole("link").filter({ hasText: title }).filter({ visible: true });

  await test.step("la retrouver dans Mes recettes", async () => {
    await page.goto("/recettes");
    await expect(card).toBeVisible();
  });

  await test.step("la supprimer", async () => {
    await card.click();
    await page.getByRole("link", { name: "Modifier" }).click();
    await page.getByRole("button", { name: "Supprimer la recette…" }).click();
    await page.getByRole("button", { name: "Oui, supprimer" }).click();
    await expect(page).toHaveURL(/\/recettes$/);
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
