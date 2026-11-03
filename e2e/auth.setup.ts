import { expect, test as setup } from "@playwright/test";

/**
 * Connexion du compte de test, une seule fois avant tous les parcours.
 * La session (cookies) est enregistrée dans e2e/.auth/session.json, que les autres
 * tests réutilisent : ils démarrent déjà connectés.
 * Le compte est fourni par les variables E2E_EMAIL et E2E_PASSWORD (secrets GitHub en CI).
 */
const SESSION = "e2e/.auth/session.json";

setup("connexion du compte de test", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("E2E_EMAIL et E2E_PASSWORD sont nécessaires.");

  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  // Connecté : on quitte la page de connexion (accueil, ou parcours d'accueil au 1er passage)
  await expect(page).not.toHaveURL(/\/connexion/);

  // Compte tout neuf : le test remplit lui-même le parcours d'accueil (nom, portions)
  if (page.url().includes("/bienvenue")) {
    await page.getByLabel("Comment vous appelez-vous ?").fill("Robot Playwright");
    await page.getByRole("button", { name: "C'est parti" }).click();
    await expect(page).not.toHaveURL(/\/bienvenue/);
  }

  await page.context().storageState({ path: SESSION });
});
