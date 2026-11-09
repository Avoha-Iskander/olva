import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import {
  createMenu,
  createRecipeFromMenu,
  deleteList,
  deleteMenu,
  deleteRecipe,
  menuIdFromUrl,
  openRevealedAction,
} from "./helpers";

/** Menus et listes sans recette (décisions 068 et 069). Tout ce qui est créé est supprimé. */

/** Carte d'une recette sur la fiche du menu. */
const recipeCard = (page: Page, title: string) =>
  page
    .getByRole("list", { name: "Recettes du menu" })
    .getByRole("listitem")
    .filter({ hasText: title });

/**
 * Sur mobile, les actions d'une carte sont sous la carte (révélées par le glissement) :
 * on les déclenche directement, Playwright ne sachant pas faire glisser au doigt.
 */
async function swipeAction(scope: ReturnType<Page["locator"]>, label: string) {
  await scope.locator("button", { hasText: label }).first().dispatchEvent("click");
}

test("formulaire, fiche, portions, retrait, duplication, liste", async ({ page }) => {
  const name = `E2E Menu ${Date.now()}`;
  let menuId = "";
  let copyId = "";
  let listId = "";

  await test.step("nouveau menu : rien n'est créé avant « Enregistrer »", async () => {
    await page.goto("/menus/nouveau");
    await page.getByLabel("Nom du menu").fill(name);
    await page.getByRole("button", { name: /^Crêpes/ }).click();
    await page.getByRole("button", { name: "Enregistrer le menu" }).click();
    await expect(page).toHaveURL(/\/menus\/[0-9a-f-]{36}$/);
    menuId = menuIdFromUrl(page);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  });

  await test.step("la fiche n'affiche que les recettes du menu", async () => {
    await expect(
      page.getByRole("list", { name: "Recettes du menu" }).getByRole("listitem"),
    ).toHaveCount(1);
    await expect(recipeCard(page, "Crêpes")).toBeVisible();
  });

  await test.step("changer les portions d'une recette", async () => {
    await openRevealedAction(page, recipeCard(page, "Crêpes"), "Portions");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Une personne de plus" }).click();
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialog).toHaveCount(0);
  });

  await test.step("créer la liste depuis la fiche, puis « Voir la liste »", async () => {
    await page.getByRole("button", { name: "Créer la liste" }).click();
    await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}\/revue$/);
    listId = new URL(page.url()).pathname.split("/")[2];
    await page.goto(`/menus/${menuId}`);
    await page.getByRole("link", { name: "Voir la liste" }).click();
    await expect(page).toHaveURL(new RegExp(`/listes/${listId}/revue$`));
  });

  await test.step("dupliquer : nouveau menu avec les mêmes recettes, sans liste", async () => {
    await page.goto("/menus");
    const card = page.locator("li", { has: page.locator(`a[href="/menus/${menuId}"]`) });
    await expect(card.getByText("Liste en préparation")).toBeVisible();
    await swipeAction(card, "Dupliquer");
    await expect(page).toHaveURL(/\/menus\/[0-9a-f-]{36}$/);
    copyId = menuIdFromUrl(page);
    expect(copyId).not.toBe(menuId);
    await expect(recipeCard(page, "Crêpes")).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer la liste" })).toBeEnabled();
  });

  await test.step("retirer une recette du menu", async () => {
    await openRevealedAction(page, recipeCard(page, "Crêpes"), "Supprimer");
    await page.getByRole("dialog").getByRole("button", { name: "Retirer" }).click();
    await expect(page.getByText("Aucune recette dans ce menu")).toBeVisible();
  });

  await test.step("ranger", async () => {
    await deleteMenu(page, copyId);
    await deleteMenu(page, menuId);
    await deleteList(page, listId);
  });
});

test("« Nouvelle » dans Mes listes : une liste sans recette, directement à la pré-liste", async ({
  page,
}) => {
  await page.goto("/listes");
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}\/pre-liste$/);
  const listId = new URL(page.url()).pathname.split("/")[2];
  await expect(page.getByRole("heading", { level: 1, name: "Nouvelle liste" })).toBeVisible();
  await expect(page.getByText(/Étape/)).toHaveCount(0);
  await deleteList(page, listId);
});

test("l'ancienne adresse « Créer une liste » mène aux menus", async ({ page }) => {
  await page.goto("/nouvelle-liste");
  await expect(page).toHaveURL(/\/menus$/);
});

test("recette ajoutée au menu après coup : « Ajouter à la liste » la fusionne dans la liste prête", async ({
  page,
}) => {
  const title = `E2E Salade ${Date.now()}`;
  const menuId = await createMenu(page, ["Crêpes"]);
  let listId = "";

  await test.step("liste prête depuis la fiche du menu", async () => {
    await page.getByRole("button", { name: "Créer la liste" }).click();
    await expect(page).toHaveURL(/\/revue$/);
    listId = new URL(page.url()).pathname.split("/")[2];
    await page.getByRole("button", { name: "Continuer : pré-liste et articles libres" }).click();
    await page.getByRole("button", { name: "Terminer la liste" }).click();
    await expect(page).toHaveURL(new RegExp(`/listes/${listId}$`));
  });

  await test.step("nouvelle recette au menu : signalée « Pas encore dans la liste »", async () => {
    await page.goto(`/menus/${menuId}/modifier`);
    await createRecipeFromMenu(page, title);
    await page.getByRole("button", { name: "Enregistrer le menu" }).click();
    await expect(page).toHaveURL(new RegExp(`/menus/${menuId}$`));
    await expect(recipeCard(page, title).getByText("Pas encore dans la liste")).toBeVisible();
    await page.getByRole("button", { name: `Ajouter « ${title} » à la liste` }).click();
    await expect(recipeCard(page, title).getByText("Pas encore dans la liste")).toHaveCount(0);
  });

  await test.step("la liste contient maintenant la recette", async () => {
    await page.getByRole("link", { name: "Voir la liste" }).click();
    await expect(page).toHaveURL(new RegExp(`/listes/${listId}$`));
    await expect(page.getByText(title).first()).toBeVisible();
  });

  await test.step("ranger", async () => {
    await deleteMenu(page, menuId);
    await deleteList(page, listId);
    await deleteRecipe(page, title);
  });
});
