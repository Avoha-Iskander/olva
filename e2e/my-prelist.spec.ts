import { expect, test } from "@playwright/test";

/** Menus → « Ma pré-liste » (US-LST-03, décision 072) : la pré-liste se consulte hors d'une liste. */
test("ouvrir ma pré-liste depuis Menus", async ({ page }) => {
  await page.goto("/menus");
  await page.getByRole("link", { name: "Ma pré-liste" }).click();
  await expect(page).toHaveURL(/\/menus\/pre-liste/);
  await expect(page.getByRole("heading", { name: "Ma pré-liste" })).toBeVisible();
  await expect(page.getByPlaceholder("Ajouter un article à ma pré-liste…")).toBeVisible();
});
