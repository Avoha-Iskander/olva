import { expect, test } from "./fixtures";
import { deleteList, itemName, openShopping, prepareList, tap } from "./helpers";

/**
 * Fin des courses (US-CRS-03, décision 070) : cocher un article, terminer en gardant la
 * case « nouvelle liste » : la liste passe dans l'historique et une nouvelle liste prête
 * reprend les seuls articles non cochés. Les deux listes sont supprimées à la fin.
 */
test("terminer les courses : historique et nouvelle liste avec les restes", async ({ page }) => {
  const listIds: { id: string; finished: boolean }[] = [];

  try {
    const first = await test.step("préparer une liste et l'ouvrir en courses", async () => {
      const id = await prepareList(page);
      listIds.push({ id, finished: false });
      await openShopping(page, id);
      return id;
    });

    const taken = await itemName(page, 0);
    const total = await page.getByRole("checkbox").count();
    const remaining = total - 1;

    await test.step(`cocher « ${taken} » seulement, puis terminer`, async () => {
      await tap(page, taken);
      await expect(page.getByText(`1 / ${total} articles dans le panier`)).toBeVisible();
      await page.waitForTimeout(1_000); // le temps que la coche soit enregistrée
      await page.getByRole("button", { name: "Terminer les courses" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(
        `${remaining} article${remaining > 1 ? "s" : ""} pas encore coché`,
      );
      await expect(
        dialog.getByRole("checkbox", {
          name: "Créer une nouvelle liste avec les articles restants",
        }),
      ).toBeChecked();
      await dialog.getByRole("button", { name: "Terminer", exact: true }).click();
      listIds[0].finished = true;
    });

    // (un même article peut figurer sur deux lignes, recette et ingrédient de base : on
    // vérifie le nombre d'articles plutôt que l'absence d'un nom)
    await test.step("la nouvelle liste s'ouvre, avec les seuls articles restants", async () => {
      await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}$/);
      const second = new URL(page.url()).pathname.split("/")[2];
      expect(second).not.toBe(first);
      listIds.push({ id: second, finished: false });
      await expect(
        page.getByText(`${remaining} article${remaining > 1 ? "s" : ""}`, { exact: false }).first(),
      ).toBeVisible();
    });

    await test.step("la première liste est dans l'onglet « Terminées »", async () => {
      await page.goto("/listes?onglet=terminees");
      await expect(page.locator(`a[href="/listes/${first}"]`)).toContainText(
        `1 / ${total} articles pris`,
      );
    });
  } finally {
    for (const { id, finished } of listIds) await deleteList(page, id, finished);
  }
});
