import type { Page } from "@playwright/test";

import { expect } from "./fixtures";

/** Outils partagés par les tests du mode courses. */

/** Étapes 1 et 2 avec la recette d'exemple « Crêpes » : arrive à l'étape 3 (pré-liste). */
export async function goToPrelist(page: Page) {
  await page.goto("/nouvelle-liste");
  await page.getByRole("button", { name: /^Crêpes/ }).click();
  await page.getByRole("button", { name: /^Revoir les ingrédients/ }).click();
  await expect(page).toHaveURL(/\/revue$/);
  await page.getByRole("button", { name: "Continuer : pré-liste et articles libres" }).click();
  await expect(page).toHaveURL(/\/pre-liste$/);
}

/** Termine la préparation (étape 3) ; renvoie l'id de la liste. */
export async function finishPreparation(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Terminer la liste" }).click();
  await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

/** Prépare une liste avec la recette d'exemple « Crêpes » (étapes 1 à 3) ; renvoie son id. */
export async function prepareList(page: Page): Promise<string> {
  await goToPrelist(page);
  return finishPreparation(page);
}

/** Supprime une liste depuis « Mes listes » (compte de test laissé propre). */
export async function deleteList(page: Page, listId: string, finished = false) {
  await page.goto(finished ? "/listes?onglet=terminees" : "/listes");
  const card = page.locator("div", { has: page.locator(`a[href="/listes/${listId}"]`) }).last();
  await card.getByRole("button", { name: /^Supprimer la / }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.locator(`a[href="/listes/${listId}"]`)).toHaveCount(0);
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
