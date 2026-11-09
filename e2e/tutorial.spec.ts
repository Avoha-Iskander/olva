import { expect, test } from "@playwright/test";

/**
 * Tutoriel (US-CPT-06) : relancé depuis les Paramètres, il présente les 4 menus
 * puis propose d'ajouter une première recette.
 */
test("le tutoriel se relance depuis les Paramètres et se parcourt jusqu'au bout", async ({
  page,
}) => {
  await page.goto("/parametres");
  await page.getByRole("button", { name: "Revoir le tutoriel" }).click();

  const bubble = page.getByRole("dialog");
  await expect(bubble).toContainText("Bienvenue sur Olva");
  await page.getByRole("button", { name: "C'est parti" }).click();
  for (const title of ["1. Recettes", "2. Menus", "3. Listes", "4. Courses"]) {
    await expect(bubble).toContainText(title);
    await page.getByRole("button", { name: "Suivant" }).click();
  }
  await expect(bubble).toContainText("À vous de jouer");
  await page.getByRole("button", { name: "Ajouter ma première recette" }).click();
  await expect(page).toHaveURL(/\/recettes\/import/);
  await expect(bubble).toBeHidden();
});
