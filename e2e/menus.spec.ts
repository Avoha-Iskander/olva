import { expect, test } from "./fixtures";
import { createMenu, deleteList, deleteMenu } from "./helpers";

/** Menus et listes sans recette (décision 068). Tout ce qui est créé est supprimé. */

test("un menu se renomme, se duplique, et ouvre sa liste", async ({ page }) => {
  const name = `E2E Menu ${Date.now()}`;
  const menuId = await createMenu(page);
  let copyId = "";
  let listId = "";

  await test.step("renommer le menu", async () => {
    await page.getByRole("button", { name: "Renommer le menu" }).click();
    await page.getByLabel("Nom du menu").fill(name);
    await page.getByRole("button", { name: "Enregistrer le nom" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  });

  await test.step("ajouter les Crêpes et créer la liste", async () => {
    await page.getByRole("button", { name: /^Crêpes/ }).click();
    await page.getByRole("button", { name: "Créer la liste" }).click();
    await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}\/revue$/);
    listId = new URL(page.url()).pathname.split("/")[2];
    await expect(page.getByText("Étape 1 sur 2")).toBeVisible();
  });

  await test.step("le menu propose maintenant « Voir la liste »", async () => {
    await page.goto(`/menus/${menuId}`);
    await page.getByRole("link", { name: "Voir la liste" }).click();
    await expect(page).toHaveURL(new RegExp(`/listes/${listId}/revue$`));
  });

  await test.step("dupliquer : nouveau menu avec les mêmes recettes, sans liste", async () => {
    await page.goto("/menus");
    const card = page.locator("li", { has: page.locator(`a[href="/menus/${menuId}"]`) });
    await expect(card.getByText("Liste en préparation")).toBeVisible();
    // Sur mobile, « Dupliquer » est sous la carte (révélé par le glissement) : on le
    // déclenche directement, Playwright ne sachant pas faire glisser au doigt
    await card.locator("button", { hasText: "Dupliquer" }).first().dispatchEvent("click");
    await expect(page).toHaveURL(/\/menus\/[0-9a-f-]{36}$/);
    copyId = new URL(page.url()).pathname.split("/")[2];
    expect(copyId).not.toBe(menuId);
    await expect(page.getByRole("region", { name: /Au menu \(1\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer la liste" })).toBeEnabled();
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
  await page.getByRole("button", { name: "Nouvelle", exact: true }).click();
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
