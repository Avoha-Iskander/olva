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

  // Connecté : on quitte la page de connexion
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));

  // On ouvre l'accueil et on attend la fin des redirections : un compte neuf est
  // renvoyé vers le parcours d'accueil (/bienvenue), que le test remplit alors lui-même
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  if (new URL(page.url()).pathname.startsWith("/bienvenue")) {
    await page.getByLabel("Comment vous appelez-vous ?").fill("Robot Playwright");
    await page.getByRole("button", { name: "C'est parti" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/bienvenue"));
  }
  // Vérification : l'accueil s'affiche bien (plus de redirection)
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);

  // Tutoriel (US-CPT-06) : il se lance tout seul tant qu'il n'a été ni vu ni passé, et
  // couvrirait l'écran pendant les parcours. On le passe (c'est enregistré dans le profil).
  const skip = page.getByRole("button", { name: "Passer le tutoriel" });
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skip.click();
    await expect(page.getByRole("dialog", { name: /Bienvenue sur Olva/ })).toBeHidden();
  }

  await page.context().storageState({ path: SESSION });
});
