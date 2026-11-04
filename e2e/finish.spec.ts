import { expect, test } from "./fixtures";
import {
  deleteList,
  finishPreparation,
  goToPrelist,
  itemName,
  openShopping,
  prepareList,
  tap,
} from "./helpers";

/**
 * Fin des courses (US-CRS-03) : cocher un article sur la liste, terminer, retrouver la
 * liste dans l'historique, puis voir les articles non cochés proposés (« Reporté ») à
 * l'étape 3 de la liste suivante. Les deux listes sont supprimées à la fin.
 */
test("terminer les courses, historique et report sur la liste suivante", async ({ page }) => {
  const listIds: { id: string; finished: boolean }[] = [];

  try {
    const first = await test.step("préparer une liste et l'ouvrir en courses", async () => {
      const id = await prepareList(page);
      listIds.push({ id, finished: false });
      await openShopping(page, id);
      return id;
    });

    const taken = await itemName(page, 0);
    const leftOver = await itemName(page, 1);
    const total = await page.getByRole("checkbox").count();

    await test.step(`cocher « ${taken} » seulement, puis terminer`, async () => {
      await tap(page, taken);
      await expect(page.getByText(`1 / ${total} articles dans le panier`)).toBeVisible();
      await page.waitForTimeout(1_000); // le temps que la coche soit enregistrée
      await page.getByRole("button", { name: "Terminer les courses" }).click();
      const dialog = page.getByRole("dialog");
      const remaining = total - 1;
      await expect(dialog).toContainText(
        `${remaining} article${remaining > 1 ? "s" : ""} non coché${remaining > 1 ? "s" : ""}`,
      );
      await dialog.getByRole("button", { name: "Terminer", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/listes/${first}$`));
      await expect(page.getByText(/^Courses terminées/)).toBeVisible();
      listIds[0].finished = true;
    });

    await test.step("la liste est dans l'onglet « Terminées »", async () => {
      await page.goto("/listes?onglet=terminees");
      await expect(page.locator(`a[href="/listes/${first}"]`)).toContainText(
        `1 / ${total} articles pris`,
      );
    });

    await test.step(`la liste suivante propose « ${leftOver} » (reporté)`, async () => {
      await goToPrelist(page);
      const section = page.getByRole("region", { name: "Reportés de vos dernières courses" });
      const row = section.locator("label").filter({ hasText: leftOver });
      await expect(row).toContainText("Reporté");
      await expect(row.getByRole("checkbox")).toBeChecked();
      // L'article pris, lui, n'est pas reporté
      await expect(section.locator("label").filter({ hasText: taken })).toHaveCount(0);
    });

    await test.step("terminer la préparation : la réserve à reporter est vidée", async () => {
      const second = await finishPreparation(page);
      listIds.push({ id: second, finished: false });
      await goToPrelist(page);
      // Ce nouveau brouillon est enregistré : il sera supprimé à la fin
      listIds.push({ id: page.url().split("/").at(-2)!, finished: false });
      await expect(
        page.getByRole("region", { name: "Reportés de vos dernières courses" }),
      ).toHaveCount(0);
    });
  } finally {
    for (const { id, finished } of listIds) await deleteList(page, id, finished);
  }
});
