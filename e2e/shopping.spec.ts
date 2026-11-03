import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

/**
 * Mode courses (US-CRS-01, US-CRS-02) : préparer une liste, l'ouvrir en courses sur DEUX
 * « téléphones » (deux navigateurs connectés au même compte), cocher sur l'un et voir la
 * coche apparaître sur l'autre, en temps réel. La liste est supprimée à la fin.
 */

/** Ouvre l'écran de courses et attend que le temps réel soit branché. */
async function openShopping(page: Page, listId: string) {
  await page.goto(`/courses/${listId}`);
  await expect(page.locator('[data-realtime="connecte"]')).toBeVisible({ timeout: 20_000 });
}

/** Case à cocher d'un article, par son nom (en début de libellé). */
const checkbox = (page: Page, name: string) =>
  page.getByRole("checkbox", {
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  });

test("cocher un article en temps réel entre deux téléphones", async ({ page, browser }) => {
  let listId = "";

  await test.step("préparer une liste avec la recette d'exemple « Crêpes »", async () => {
    await page.goto("/nouvelle-liste");
    await page.getByRole("button", { name: /^Crêpes/ }).click();
    await page.getByRole("button", { name: /^Revoir les ingrédients/ }).click();
    await expect(page).toHaveURL(/\/revue$/);
    await page.getByRole("button", { name: "Continuer : pré-liste et articles libres" }).click();
    await expect(page).toHaveURL(/\/pre-liste$/);
    await page.getByRole("button", { name: "Terminer la liste" }).click();
    await expect(page).toHaveURL(/\/listes\/[0-9a-f-]{36}$/);
    listId = page.url().split("/").pop()!;
  });

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
    const first = page.getByRole("checkbox").first();
    const name = (await first.locator("xpath=..").locator("span.font-medium").innerText()).trim();

    await test.step(`cocher « ${name} » sur le 1er téléphone`, async () => {
      await checkbox(page, name).click();
      await expect(checkbox(page, name)).toBeChecked();
      await expect(page.getByText(/^1 \/ \d+ articles? dans le panier$/)).toBeVisible();
    });

    await test.step("la coche apparaît sur le 2e téléphone, sans recharger", async () => {
      await expect(checkbox(other, name)).toBeChecked({ timeout: 15_000 });
    });

    await test.step("décocher sur le 2e téléphone : le 1er suit", async () => {
      await checkbox(other, name).click();
      await expect(checkbox(page, name)).not.toBeChecked({ timeout: 15_000 });
    });

    await test.step("la coche est bien enregistrée (rechargement de la page)", async () => {
      await checkbox(page, name).click();
      await expect(checkbox(page, name)).toBeChecked();
      await page.waitForTimeout(1_000); // le temps que l'enregistrement parte
      await page.reload();
      await expect(checkbox(page, name)).toBeChecked();
    });
  } finally {
    await otherContext.close();
    // Nettoyage : la liste est supprimée depuis « Mes listes en cours »
    if (listId) {
      await page.goto("/listes");
      const card = page.locator("div", { has: page.locator(`a[href="/listes/${listId}"]`) }).last();
      await card.getByRole("button", { name: /^Supprimer la / }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();
      await expect(page.locator(`a[href="/listes/${listId}"]`)).toHaveCount(0);
    }
  }
});
