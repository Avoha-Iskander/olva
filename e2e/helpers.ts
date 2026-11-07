import type { Page } from "@playwright/test";

import { expect } from "./fixtures";

/** Outils partagés par les tests du mode courses. */

/** Crée un menu vide depuis « Mes menus » ; renvoie son id (on est sur sa page). */
export async function createMenu(page: Page): Promise<string> {
  await page.goto("/menus");
  await page.getByRole("button", { name: "Nouveau", exact: true }).click();
  await expect(page).toHaveURL(/\/menus\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname.split("/")[2];
}

/**
 * « Créer une recette » depuis la page d'un menu : une salade de tomates saisie à la main.
 * On revient au menu, recette ajoutée (US-MEN-01).
 */
export async function createRecipeFromMenu(page: Page, menuId: string, title: string) {
  await page.getByRole("button", { name: "Créer une recette" }).click();
  await page.getByRole("button", { name: "Saisir à la main" }).click();
  await expect(page).toHaveURL(new RegExp(`/recettes/nouvelle\\?menu=${menuId}$`));
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
  await expect(page).toHaveURL(new RegExp(`/menus/${menuId}\\?ajout=[0-9a-f-]{36}$`));
}

/** Supprime une recette par son titre (depuis sa fiche). */
export async function deleteRecipe(page: Page, title: string) {
  await page.goto("/recettes");
  await page.getByRole("link").filter({ hasText: title }).filter({ visible: true }).click();
  await page.getByRole("link", { name: "Modifier", exact: true }).click();
  await page.getByRole("button", { name: "Supprimer la recette…" }).click();
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(page).toHaveURL(/\/recettes$/);
}

/** Supprime un menu depuis sa page (sa liste éventuelle est gardée). */
export async function deleteMenu(page: Page, menuId: string) {
  await page.goto(`/menus/${menuId}`);
  await page.getByRole("button", { name: "Supprimer le menu…" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(page).toHaveURL(/\/menus$/);
  await expect(page.locator(`a[href="/menus/${menuId}"]`)).toHaveCount(0);
}

/**
 * Menu avec la recette d'exemple « Crêpes » → « Créer la liste » → revue → pré-liste.
 * Le menu est supprimé en route (sa liste est gardée, US-MEN-04) : le compte de test
 * reste propre, et deleteList suffit ensuite pour ranger.
 */
export async function goToPrelist(page: Page) {
  const menuId = await createMenu(page);
  await page.getByRole("button", { name: /^Crêpes/ }).click();
  await page.getByRole("button", { name: "Créer la liste" }).click();
  await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}\/revue$/);
  const listId = new URL(page.url()).pathname.split("/")[2];

  await deleteMenu(page, menuId);
  await page.goto(`/listes/${listId}/revue`);
  await page.getByRole("button", { name: "Continuer : pré-liste et articles libres" }).click();
  await expect(page).toHaveURL(/\/pre-liste$/);
}

/** Termine la préparation (pré-liste) ; renvoie l'id de la liste. */
export async function finishPreparation(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Terminer la liste" }).click();
  await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

/** Prépare une liste avec la recette d'exemple « Crêpes » (menu, revue, pré-liste) ; renvoie son id. */
export async function prepareList(page: Page): Promise<string> {
  await goToPrelist(page);
  return finishPreparation(page);
}

/** Supprime une liste depuis « Mes listes » (compte de test laissé propre). */
export async function deleteList(page: Page, listId: string, finished = false) {
  await page.goto(finished ? "/listes?onglet=terminees" : "/listes");
  // Un brouillon mène à son étape en cours (/listes/<id>/revue…) : on compare le début
  const link = page.locator(`a[href^="/listes/${listId}"]`);
  const card = page.locator("div", { has: link }).last();
  await card.getByRole("button", { name: /^Supprimer la / }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(link).toHaveCount(0);
}

/** Ouvre l'écran de courses et attend que le temps réel soit branché. */
export async function openShopping(page: Page, listId: string) {
  await page.goto(`/courses/${listId}`);
  await expect(page.locator('[data-realtime="connecte"]')).toBeVisible({ timeout: 20_000 });
}

/** Case à cocher d'un article, par son nom (en début de libellé). */
export const checkbox = (page: Page, name: string) =>
  page.getByRole("checkbox", {
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  });

/** Toucher la ligne d'un article (toute la ligne est cliquable, comme pour une personne). */
export const tap = (page: Page, name: string) =>
  page
    .locator("label")
    .filter({ has: checkbox(page, name) })
    .click();

/** Nom du n-ième article de l'écran de courses. */
export async function itemName(page: Page, index: number) {
  const box = page.getByRole("checkbox").nth(index);
  return (await box.locator("xpath=..").locator("[data-item-name]").innerText()).trim();
}
