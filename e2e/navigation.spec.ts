import { expect, test } from "@playwright/test";

/**
 * Les 4 entrées du menu s'ouvrent sans erreur (compte connecté).
 * Ouvrir « Menus » ne crée rien : il faut toucher « Nouveau » (décision 068).
 */
const PAGES = [
  { path: "/recettes", heading: "Mes recettes" },
  { path: "/menus", heading: "Mes menus" },
  { path: "/listes", heading: "Mes listes" },
  { path: "/courses", heading: "Mes courses" },
];

test("l'accueil propose les 4 entrées du menu", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Recettes", "Menus", "Listes", "Courses"]) {
    await expect(
      page.getByRole("link", { name, exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  }
});

for (const { path, heading } of PAGES) {
  test(`la page ${path} s'ouvre`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
}
