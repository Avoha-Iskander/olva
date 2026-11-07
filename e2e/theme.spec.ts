import { expect, test } from "./fixtures";

/** Apparence (US-CPT-05) : le choix s'applique tout de suite et reste après rechargement. */
test("choisir le mode sombre, puis revenir à Automatique", async ({ page }) => {
  const html = page.locator("html");
  await page.goto("/parametres");
  const choice = page.getByRole("radiogroup", { name: "Apparence" });

  try {
    await choice.getByRole("radio", { name: "Sombre" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.waitForTimeout(1_000); // le temps d'enregistrer dans le profil
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(choice.getByRole("radio", { name: "Sombre" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  } finally {
    // Le compte de test revient à Automatique
    await choice.getByRole("radio", { name: "Automatique" }).click();
    await expect(html).not.toHaveAttribute("data-theme", /.+/);
    await page.waitForTimeout(1_000);
  }
});
