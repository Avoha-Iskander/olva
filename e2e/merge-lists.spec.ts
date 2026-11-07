import { expect, test } from "./fixtures";
import { deleteList, prepareList } from "./helpers";

/**
 * Verser une liste dans une autre (US-LST-10) : deux listes « Crêpes » identiques ;
 * verser la première dans la seconde additionne les quantités (même nombre d'articles)
 * et supprime la première.
 */
test("verser une liste dans une autre", async ({ page }) => {
  const first = await prepareList(page);
  const second = await prepareList(page);

  // Nombre d'articles de la liste d'arrivée, avant
  await page.goto(`/listes/${second}`);
  const count = page.getByText(/^\d+ articles?/).first();
  const before = await count.innerText();

  await test.step("verser la première liste dans la seconde", async () => {
    await page.goto(`/listes/${first}`);
    await page.getByRole("button", { name: "Verser…" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator(`[data-list-id="${second}"]`).click();
    await dialog.getByRole("button", { name: "Verser", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/listes/${second}$`));
  });

  await test.step("mêmes articles, quantités additionnées ; la première liste a disparu", async () => {
    await expect(page.getByText(/^\d+ articles?/).first()).toHaveText(before);
    await page.goto("/listes");
    await expect(page.locator(`a[href^="/listes/${first}"]`)).toHaveCount(0);
  });

  await deleteList(page, second);
});
