import { expect, test } from "@playwright/test";

/**
 * Parcours « recette » complet : créer une recette à la main, la retrouver, la supprimer.
 * La recette est supprimée à la fin : le compte de test reste propre.
 * Un titre unique (date et heure) évite toute confusion avec un passage précédent.
 */
test("créer, afficher puis supprimer une recette", async ({ page }) => {
  const title = `E2E Pâte à crêpes ${Date.now()}`;

  // 1. Formulaire de nouvelle recette
  await page.goto("/recettes/nouvelle");
  await page.getByLabel("Titre").fill(title);

  // Ingrédient : on cherche « farine » dans le catalogue et on prend le premier article
  // proposé (pas la ligne « Créer … »)
  await page.getByRole("combobox").first().click();
  await page.getByPlaceholder("Rechercher (ex. tomate)").fill("farine");
  await page.getByRole("option").filter({ hasNotText: /Créer/ }).first().click();
  await page.getByLabel("Ingrédient 1 : quantité (vide = au goût)").fill("250");
  await page.getByLabel("Ingrédient 1 : unité").selectOption("g");
  await page.getByLabel("Étape 1").fill("Mélanger la farine et le lait.");

  await page.getByRole("button", { name: "Enregistrer" }).click();

  // 2. La fiche de la recette s'affiche
  await expect(page).toHaveURL(/\/recettes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Mélanger la farine et le lait.")).toBeVisible();

  // 3. Elle apparaît dans Mes recettes
  // (la carte existe en deux versions, mobile et ordinateur : on prend celle qui est visible)
  await page.goto("/recettes");
  const card = page.getByRole("link").filter({ hasText: title }).filter({ visible: true });
  await expect(card).toBeVisible();

  // 4. Suppression depuis l'écran de modification
  await card.click();
  await page.getByRole("link", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Supprimer la recette…" }).click();
  await page.getByRole("button", { name: "Oui, supprimer" }).click();

  await expect(page).toHaveURL(/\/recettes$/);
  await expect(page.getByText(title)).toHaveCount(0);
});
