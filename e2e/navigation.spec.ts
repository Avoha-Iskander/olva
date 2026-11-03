import { expect, test } from "@playwright/test";

/**
 * Les 4 entrées du menu s'ouvrent sans erreur (compte connecté).
 * « Créer une liste » n'enregistre rien tant qu'aucune recette n'est choisie (décision 044) :
 * l'ouvrir ne laisse pas de brouillon dans le compte de test.
 */
const PAGES = [
  { path: "/recettes", heading: "Mes recettes" },
  { path: "/nouvelle-liste", heading: /Nouvelle liste/ },
  { path: "/listes", heading: "Mes listes en cours" },
  { path: "/courses", heading: "Faire ses courses" },
];

test("l'accueil propose les 4 entrées du menu", async ({ page }) => {
  await page.goto("/");
  for (const name of [
    "Mes recettes",
    "Créer une liste",
    "Mes listes en cours",
    "Faire ses courses",
  ]) {
    await expect(page.getByRole("link", { name }).filter({ visible: true }).first()).toBeVisible();
  }
});

for (const { path, heading } of PAGES) {
  test(`la page ${path} s'ouvre`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
}
