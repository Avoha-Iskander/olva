import { expect, test } from "./fixtures";
import { checkbox, deleteList, itemName, openShopping, prepareList, tap } from "./helpers";

/**
 * Hors ligne (US-CRS-02) : la liste ouverte une fois avec réseau reste utilisable sans
 * réseau ; les coches partent au retour du réseau, et l'autre téléphone les reçoit.
 * Le réseau du navigateur de test est coupé par Playwright (context.setOffline).
 */
test("cocher hors ligne, puis synchroniser au retour du réseau", async ({
  page,
  context,
  browser,
}) => {
  const listId = await test.step("préparer une liste", () => prepareList(page));
  const otherContext = await browser.newContext({ storageState: "e2e/.auth/session.json" });
  const other = await otherContext.newPage();

  try {
    await test.step("ouvrir la liste avec réseau : elle est gardée sur le téléphone", async () => {
      await openShopping(page, listId);
      // Le service worker confirme avoir gardé la page (et ses fichiers de code)
      await expect(page.locator('[data-hors-ligne-pret="oui"]')).toBeVisible({
        timeout: 30_000,
      });
    });

    const first = await itemName(page, 0);
    const second = await itemName(page, 1);

    await test.step("couper le réseau et cocher deux articles", async () => {
      await context.setOffline(true);
      await expect(page.getByText(/^Hors ligne/)).toBeVisible();
      await tap(page, first);
      await tap(page, second);
      await expect(checkbox(page, first)).toBeChecked();
      await expect(
        page.getByText("Hors ligne — 2 coches seront envoyées au retour du réseau"),
      ).toBeVisible();
    });

    await test.step("décocher une coche faite hors ligne (erreur de doigt)", async () => {
      await tap(page, second);
      await expect(checkbox(page, second)).not.toBeChecked();
      await expect(
        page.getByText("Hors ligne — 1 coche sera envoyée au retour du réseau"),
      ).toBeVisible();
    });

    await test.step("recharger sans réseau : la liste et la coche sont toujours là", async () => {
      await page.reload();
      await expect(checkbox(page, first)).toBeChecked({ timeout: 15_000 });
      await expect(checkbox(page, second)).not.toBeChecked();
    });

    await test.step("rétablir le réseau : la coche part, le bandeau disparaît", async () => {
      await context.setOffline(false);
      await expect(page.getByText(/^Hors ligne|^Envoi de/)).toHaveCount(0, { timeout: 20_000 });
    });

    await test.step("l'autre téléphone voit la coche faite hors ligne", async () => {
      await openShopping(other, listId);
      await expect(checkbox(other, first)).toBeChecked();
      await expect(checkbox(other, second)).not.toBeChecked();
    });
  } finally {
    await context.setOffline(false);
    await otherContext.close();
    await deleteList(page, listId);
  }
});
