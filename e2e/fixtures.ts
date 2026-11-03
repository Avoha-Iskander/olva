import { test as base } from "@playwright/test";

/**
 * Le « test » de Playwright, avec un ajout : quand un test échoue, l'adresse de la page et
 * son contenu (arbre d'accessibilité : titres, boutons, champs…) sont écrits dans le
 * journal. Utile en CI, où les captures d'écran ne sont pas toujours faciles à consulter.
 */
export const test = base.extend<{ logOnFailure: void }>({
  logOnFailure: [
    async ({ page }, use, testInfo) => {
      await use();
      if (testInfo.status !== testInfo.expectedStatus) {
        const snapshot = await page
          .locator("body")
          .ariaSnapshot({ timeout: 5_000 })
          .catch(() => "(contenu indisponible)");
        console.log(
          `\n--- Page au moment de l'échec : ${page.url()}\n${snapshot.slice(0, 4000)}\n---`,
        );
      }
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
