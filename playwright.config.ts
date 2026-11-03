/**
 * Tests de bout en bout avec Playwright (SPEC décision 047 et 053).
 *
 * Playwright pilote un vrai navigateur : il ouvre l'app, se connecte avec un compte de
 * test et clique dans les écrans comme le ferait une personne. Ces tests vérifient des
 * parcours entiers (connexion → recette → liste…), là où Vitest vérifie des fonctions.
 *
 * L'app testée est construite puis lancée sur la machine de test (port 3000), branchée
 * sur le projet Supabase de DEV. Jamais sur la prod.
 * Lancement : `npm run e2e` (variables E2E_EMAIL et E2E_PASSWORD nécessaires).
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  // Un test qui échoue est relancé une fois en CI : un réseau lent ne doit pas tout bloquer
  retries: process.env.CI ? 1 : 0,
  // Les tests partagent le même compte : on les lance l'un après l'autre
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    // En cas d'échec : capture d'écran et « trace » (film pas à pas) pour comprendre
    screenshot: "only-on-failure",
    // Une action bloquée (élément introuvable…) échoue vite, avec un message précis
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
  },
  projects: [
    // 1. Connexion une seule fois ; la session est gardée dans un fichier
    { name: "connexion", testMatch: /auth\.setup\.ts/ },
    // 2. Les parcours, sur un téléphone simulé (l'app est d'abord pensée pour le mobile)
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], storageState: "e2e/.auth/session.json" },
      dependencies: ["connexion"],
    },
  ],
  // L'app est construite puis lancée avant les tests (déjà lancée en local : réutilisée)
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/connexion`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
});
