import { expect, test } from "./fixtures";

/**
 * Parcours « recette » complet : créer une recette à la main, la retrouver, la supprimer.
 * La recette est supprimée à la fin : le compte de test reste propre.
 * Un titre unique (date et heure) évite toute confusion avec un passage précédent.
 * Chaque étape est nommée : en cas d'échec, le journal dit laquelle a bloqué.
 */
test("créer, afficher puis supprimer une recette", async ({ page }) => {
  const title = `E2E Pâte à crêpes ${Date.now()}`;
  // Lien d'origine fictif : sert à vérifier qu'un lien déjà importé n'est pas relu
  const link = `https://example.com/olva-e2e-${Date.now()}`;
  let recipeUrl = "";

  await test.step("ouvrir le formulaire et saisir le titre", async () => {
    await page.goto("/recettes/nouvelle");
    await page.getByLabel("Titre").fill(title);
    await page.getByLabel("Lien de la page").fill(link);
  });

  await test.step("choisir l'ingrédient dans le catalogue", async () => {
    // On cherche « farine » et on prend le premier article proposé (pas la ligne « Créer … »)
    await page.getByRole("combobox").first().click();
    await page.getByPlaceholder("Rechercher (ex. tomate)").fill("farine");
    // Dans la liste de recherche du catalogue (et non dans le menu des unités, qui a aussi
    // des « options »)
    await page
      .getByRole("listbox")
      .getByRole("option")
      .filter({ hasNotText: /Créer/ })
      .first()
      .click();
  });

  await test.step("quantité, unité et étape", async () => {
    await page.getByLabel("Ingrédient 1 : quantité (vide = au goût)").fill("250");
    await page.getByLabel("Ingrédient 1 : unité").selectOption("g");
    await page
      .getByRole("textbox", { name: "Étape 1", exact: true })
      .fill("Mélanger la farine et le lait.");
  });

  await test.step("enregistrer et voir la fiche", async () => {
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/recettes\/[0-9a-f-]{36}$/);
    recipeUrl = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    // L'étape, dans le texte de la fiche (pas dans le champ du formulaire qu'on vient de quitter)
    await expect(
      page.getByRole("paragraph").filter({ hasText: "Mélanger la farine et le lait." }),
    ).toBeVisible();
  });

  await test.step("revenir sur « Nouvelle recette » : le formulaire est vierge", async () => {
    // Navigation dans l'app (et non rechargement) : Next.js garde les écrans quittés en
    // mémoire ; un écran de création doit pourtant repartir de zéro
    await page
      .getByRole("link", { name: "Mes recettes" })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/recettes$/);
    await page.getByRole("button", { name: "Ajouter" }).click();
    await page.getByRole("link", { name: "Saisir à la main" }).click();
    await expect(page).toHaveURL(/\/recettes\/nouvelle$/);
    await expect(page.getByLabel("Titre")).toHaveValue("");
  });

  await test.step("partager le même lien vers Olva : la recette existante s'ouvre", async () => {
    // Décision 065 : comme le menu « Partager » ou le Raccourci iPhone, avec du texte
    // autour du lien et un paramètre de suivi ; la lecture démarre seule.
    // Décision 060 : lien déjà importé, reconnu avant tout appel à Claude
    const shared = `Regarde cette recette ${link}?utm_source=partage !`;
    await page.goto(`/recettes/partage?text=${encodeURIComponent(shared)}`);
    await expect(page).toHaveURL(new RegExp(`${recipeUrl}\\?deja=1$`));
    await expect(page.getByText("Vous aviez déjà importé cette recette")).toBeVisible();
  });

  // La carte existe en deux versions (mobile et ordinateur) : on prend celle qui est visible
  const card = page.getByRole("link").filter({ hasText: title }).filter({ visible: true });

  await test.step("la retrouver dans Mes recettes", async () => {
    await page.goto("/recettes");
    await expect(card).toBeVisible();
  });

  await test.step("la supprimer", async () => {
    await card.click();
    await page.getByRole("link", { name: "Modifier", exact: true }).click();
    await page.getByRole("button", { name: "Supprimer la recette…" }).click();
    await page.getByRole("button", { name: "Oui, supprimer" }).click();
    await expect(page).toHaveURL(/\/recettes$/);
    // Les écrans quittés restent en mémoire, cachés (Next.js) : on ne compte que les liens
    // visibles de la liste, pas tout le texte de la page
    await expect(page.getByRole("link").filter({ hasText: title })).toHaveCount(0);
  });
});
