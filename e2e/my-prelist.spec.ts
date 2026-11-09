import { expect, test } from "@playwright/test";

/** Mes listes → « Ma pré-liste » (US-LST-03, décision 072) : la pré-liste se consulte hors d'une liste. */
test("ouvrir ma pré-liste depuis Mes listes", async ({ page }) => {
  await page.goto("/listes");
  await page.getByRole("link", { name: "Ma pré-liste" }).click();
  await expect(page).toHaveURL(/\/listes\/pre-liste/);
  await expect(page.getByRole("heading", { name: "Ma pré-liste" })).toBeVisible();
  // La pré-liste par défaut est créée, et l'ajout passe par le sélecteur d'articles
  await expect(page.getByText("Ajouter un article à ma pré-liste…")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Retirer .* de ma pré-liste$/ }).first(),
  ).toBeVisible();
});
