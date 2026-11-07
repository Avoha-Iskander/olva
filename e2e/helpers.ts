import type { Page } from "@playwright/test";

import { expect } from "./fixtures";

/** Outils partagés par les tests du mode courses. */

/** Ouvre le formulaire d'un nouveau menu depuis « Mes menus ». */
export async function openNewMenu(page: Page) {
  await page.goto("/menus");
  await page.getByRole("link", { name: "Nouveau", exact: true }).click();
  await expect(page).toHaveURL(/\/menus\/nouveau$/);
}

/** Id du menu affiché (fiche /menus/<id> ou formulaire /menus/<id>/modifier). */
export const menuIdFromUrl = (page: Page) => new URL(page.url()).pathname.split("/")[2];

/**
 * Crée un menu avec ces recettes (par le début de leur titre) et l'enregistre ;
 * renvoie son id (on est sur sa fiche).
 */
export async function createMenu(page: Page, recipes: string[] = []): Promise<string> {
  await openNewMenu(page);
  for (const title of recipes) {
    await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  }
  await page.getByRole("button", { name: "Enregistrer le menu" }).click();
  await expect(page).toHaveURL(/\/menus\/[0-9a-f-]{36}$/);
  return menuIdFromUrl(page);
}

/**
 * « Créer une recette » depuis le formulaire d'un menu : une salade de tomates saisie à la
 * main. Le menu est enregistré au départ ; on revient au formulaire, recette ajoutée.
 * Renvoie l'id du menu.
 */
export async function createRecipeFromMenu(page: Page, title: string): Promise<string> {
  await page.getByRole("button", { name: "Créer une recette" }).click();
  await page.getByRole("button", { name: "Saisir à la main" }).click();
  await expect(page).toHaveURL(/\/recettes\/nouvelle\?menu=[0-9a-f-]{36}$/);
  const menuId = new URL(page.url()).searchParams.get("menu")!;
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
  await expect(page).toHaveURL(new RegExp(`/menus/${menuId}/modifier\\?ajout=[0-9a-f-]{36}$`));
  return menuId;
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

/** Supprime un menu depuis sa fiche (sa liste éventuelle est gardée). */
export async function deleteMenu(page: Page, menuId: string) {
  await page.goto(`/menus/${menuId}`);
  await page.getByRole("button", { name: "Supprimer le menu…" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(page).toHaveURL(/\/menus$/);
  await expect(page.locator(`a[href="/menus/${menuId}"]`)).toHaveCount(0);
}

/**
 * Nouveau menu avec la recette d'exemple « Crêpes » → « Enregistrer et créer la liste »
 * → revue → pré-liste. Le menu est supprimé en route (sa liste est gardée, US-MEN-04) :
 * le compte de test reste propre, et deleteList suffit ensuite pour ranger.
 */
export async function goToPrelist(page: Page) {
  await openNewMenu(page);
  await page.getByRole("button", { name: /^Crêpes/ }).click();
  await page.getByRole("button", { name: "Enregistrer et créer la liste" }).click();
  await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}\/revue$/);
  const listId = new URL(page.url()).pathname.split("/")[2];
  // Le lien « Modifier le menu » de la revue donne l'id du menu
  const menuHref = await page.getByRole("link", { name: "Modifier le menu" }).getAttribute("href");

  await deleteMenu(page, menuHref!.split("/")[2]);
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
  const card = page.locator("li", { has: link });
  // Sur mobile, « Supprimer » est sous la carte (révélé par le glissement, US-LST-09) :
  // on le déclenche directement, Playwright ne sachant pas faire glisser au doigt
  await card.locator("button", { hasText: "Supprimer" }).first().dispatchEvent("click");
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
