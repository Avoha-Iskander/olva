import { expect, test } from "./fixtures";
import { checkbox, deleteList, itemName, openShopping, prepareList, tap } from "./helpers";

/**
 * Mode courses (US-CRS-01, US-CRS-02) : préparer une liste, l'ouvrir en courses sur DEUX
 * « téléphones » (deux navigateurs connectés au même compte), cocher sur l'un et voir la
 * coche apparaître sur l'autre, en temps réel. La liste est supprimée à la fin.
 */
test("cocher un article en temps réel entre deux téléphones", async ({ page, browser }) => {
  const listId = await test.step("préparer une liste", () => prepareList(page));

  // Deuxième « téléphone » : un autre navigateur, avec la même session
  const otherContext = await browser.newContext({ storageState: "e2e/.auth/session.json" });
  const other = await otherContext.newPage();

  try {
    await test.step("ouvrir la liste en courses sur les deux téléphones", async () => {
      await page.getByRole("link", { name: "Faire les courses" }).click();
      await expect(page).toHaveURL(new RegExp(`/courses/${listId}$`));
      await expect(page.locator('[data-realtime="connecte"]')).toBeVisible({ timeout: 20_000 });
      await openShopping(other, listId);
    });

    // Le premier article à prendre : son nom sert à le retrouver sur l'autre téléphone
    const name = await itemName(page, 0);

    await test.step(`cocher « ${name} » sur le 1er téléphone`, async () => {
      await tap(page, name);
      await expect(checkbox(page, name)).toBeChecked();
      await expect(page.getByText(/^1 \/ \d+ articles? dans le panier$/)).toBeVisible();
    });

    await test.step("la coche apparaît sur le 2e téléphone, sans recharger", async () => {
      await expect(checkbox(other, name)).toBeChecked({ timeout: 15_000 });
    });

    await test.step("décocher sur le 2e téléphone : le 1er suit", async () => {
      await tap(other, name);
      await expect(checkbox(page, name)).not.toBeChecked({ timeout: 15_000 });
    });

    await test.step("la coche est bien enregistrée (rechargement de la page)", async () => {
      await tap(page, name);
      await expect(checkbox(page, name)).toBeChecked();
      await page.waitForTimeout(1_000); // le temps que l'enregistrement parte
      await page.reload();
      await expect(checkbox(page, name)).toBeChecked();
    });
  } finally {
    await otherContext.close();
    await deleteList(page, listId);
  }
});
