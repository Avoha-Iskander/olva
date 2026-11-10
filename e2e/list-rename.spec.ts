import { expect, test } from "./fixtures";
import { deleteList, prepareList } from "./helpers";

/** Renommer une liste (US-LST-11) ; un nom vide reprend la date. */
test("renommer une liste, puis revenir au nom par défaut", async ({ page }) => {
  const name = `E2E Courses ${Date.now()}`;
  const listId = await prepareList(page);

  try {
    await test.step("renommer depuis la page de la liste", async () => {
      await page.goto(`/listes/${listId}`);
      await page.getByRole("button", { name: "Renommer la liste" }).click();
      await page.getByLabel("Nom de la liste").fill(name);
      await page.getByRole("button", { name: "Enregistrer le nom" }).click();
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    });

    await test.step("le nom apparaît dans Mes listes", async () => {
      await page.goto("/listes");
      await expect(page.locator(`a[href^="/listes/${listId}"]`)).toContainText(name);
    });

    await test.step("nom vide : retour à « Liste du … »", async () => {
      await page.goto(`/listes/${listId}`);
      await page.getByRole("button", { name: "Renommer la liste" }).click();
      await page.getByLabel("Nom de la liste").fill("");
      await page.getByRole("button", { name: "Enregistrer le nom" }).click();
      await expect(page.getByRole("heading", { level: 1, name: /^Liste du / })).toBeVisible();
    });
  } finally {
    await deleteList(page, listId);
  }
});
