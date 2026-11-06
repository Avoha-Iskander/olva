import { describe, expect, it } from "vitest";

import {
  decodeEntities,
  findJsonLdRecipe,
  hasReadableContent,
  pageToPromptText,
  readRecipePage,
  visibleText,
} from "@/lib/url-import/recipe-page";

const page = (jsonLd: unknown, body = "") =>
  `<html><head><title>Ma recette &amp; moi</title>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head>
  <body>${body}</body></html>`;

describe("findJsonLdRecipe", () => {
  it("lit une fiche Recipe simple", () => {
    const recipe = findJsonLdRecipe(
      page({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Tarte aux pommes",
        recipeYield: "6 personnes",
        recipeIngredient: ["200 g de farine", "4 pommes"],
        recipeInstructions: [
          { "@type": "HowToStep", text: "Étaler la pâte." },
          { "@type": "HowToStep", text: "Cuire 35 min." },
        ],
        image: "https://exemple.fr/tarte.jpg",
      }),
    );
    expect(recipe).toEqual({
      title: "Tarte aux pommes",
      servings: "6 personnes",
      ingredients: ["200 g de farine", "4 pommes"],
      steps: ["Étaler la pâte.", "Cuire 35 min."],
      imageUrl: "https://exemple.fr/tarte.jpg",
    });
  });

  it("trouve la recette dans un « @graph » (format de nombreux sites)", () => {
    const recipe = findJsonLdRecipe(
      page({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", name: "Page" },
          { "@type": ["Recipe", "NewsArticle"], name: "Crêpes", recipeIngredient: ["Lait"] },
        ],
      }),
    );
    expect(recipe?.title).toBe("Crêpes");
  });

  it("lit les étapes rangées en sections, et une image ImageObject", () => {
    const recipe = findJsonLdRecipe(
      page({
        "@type": "Recipe",
        name: "Lasagnes",
        recipeIngredient: ["Pâtes"],
        recipeInstructions: [
          {
            "@type": "HowToSection",
            name: "Sauce",
            itemListElement: [{ "@type": "HowToStep", text: "Faire revenir." }],
          },
          {
            "@type": "HowToSection",
            name: "Montage",
            itemListElement: [{ "@type": "HowToStep", text: "Alterner les couches." }],
          },
        ],
        image: [{ "@type": "ImageObject", url: "https://exemple.fr/lasagnes.jpg" }],
        recipeYield: [4, "4 parts"],
      }),
    );
    expect(recipe?.steps).toEqual(["Faire revenir.", "Alterner les couches."]);
    expect(recipe?.imageUrl).toBe("https://exemple.fr/lasagnes.jpg");
    expect(recipe?.servings).toBe("4");
  });

  it("nettoie les balises et entités dans les textes", () => {
    const recipe = findJsonLdRecipe(
      page({
        "@type": "Recipe",
        name: "Cr&egrave;me br&#251;l&#xE9;e",
        recipeIngredient: ["<b>50 cl</b> de cr&egrave;me"],
        recipeInstructions: "Chauffer.<br>Verser.",
      }),
    );
    expect(recipe?.title).toBe("Crème brûlée");
    expect(recipe?.ingredients).toEqual(["50 cl de crème"]);
    expect(recipe?.steps).toEqual(["Chauffer.", "Verser."]);
  });

  it("ignore une fiche mal formée et renvoie null sans recette", () => {
    const html =
      '<script type="application/ld+json">{ pas du json </script>' +
      `<script type="application/ld+json">${JSON.stringify({ "@type": "Article" })}</script>`;
    expect(findJsonLdRecipe(html)).toBeNull();
  });
});

describe("visibleText", () => {
  it("garde le texte lisible, sans scripts, styles ni menus", () => {
    const text = visibleText(
      "<nav>Menu</nav><style>.a{}</style><script>alert(1)</script>" +
        "<h1>Gratin</h1><ul><li>1 kg de pommes de terre</li><li>50 cl de lait</li></ul><footer>Mentions</footer>",
    );
    expect(text).toBe("Gratin\n1 kg de pommes de terre\n50 cl de lait");
  });
});

describe("readRecipePage", () => {
  it("prend l'image de partage si la fiche n'en a pas, et complète une adresse relative", () => {
    const html =
      '<head><meta property="og:image" content="/img/gratin.jpg"><title>Gratin</title></head>' +
      "<body>Texte</body>";
    const result = readRecipePage(html, "https://exemple.fr/recettes/gratin");
    expect(result.imageUrl).toBe("https://exemple.fr/img/gratin.jpg");
    expect(result.recipe).toBeNull();
    expect(result.title).toBe("Gratin");
  });
});

describe("description de partage (Instagram)", () => {
  const caption =
    "1 200 J'aime - chef sur Instagram : &quot;Salade grecque 🥗 Pour 4 : 4 tomates, 1 concombre, " +
    "200 g de feta, 1 oignon rouge, olives noires, huile d'olive. Couper, mélanger, servir frais. " +
    "Origan à volonté !&quot;";
  const html =
    `<head><meta property="og:description" content="${caption}"><title>Instagram</title></head>` +
    "<body>Connectez-vous</body>";

  it("lit la légende, entités décodées", () => {
    const page = readRecipePage(html, "https://www.instagram.com/p/AbC/");
    expect(page.description).toContain('"Salade grecque');
    expect(page.description).toContain("200 g de feta");
  });

  it("une page presque vide mais avec une longue légende est lisible, et la légende est lue", () => {
    const page = readRecipePage(html, "https://www.instagram.com/p/AbC/");
    expect(hasReadableContent(page)).toBe(true);
    expect(pageToPromptText(page)).toContain("Description de la page :");
  });

  it('accepte aussi la balise dans l\'autre ordre, ou name="description"', () => {
    const page = readRecipePage(
      '<meta content="Tarte facile" name="description"><title>T</title>',
      "https://exemple.fr/t",
    );
    expect(page.description).toBe("Tarte facile");
  });
});

describe("pageToPromptText et hasReadableContent", () => {
  it("envoie la fiche bien rangée quand elle existe", () => {
    const result = readRecipePage(
      page({
        "@type": "Recipe",
        name: "Crêpes",
        recipeYield: "4",
        recipeIngredient: ["250 g de farine"],
        recipeInstructions: ["Mélanger."],
      }),
      "https://exemple.fr/crepes",
    );
    expect(hasReadableContent(result)).toBe(true);
    const text = pageToPromptText(result);
    expect(text).toContain("- 250 g de farine");
    expect(text).toContain("1. Mélanger.");
  });

  it("sinon, envoie le texte de la page ; une page presque vide n'est pas lisible", () => {
    const empty = readRecipePage(
      "<title>Accès refusé</title><body>Veuillez patienter</body>",
      "https://x.fr",
    );
    expect(hasReadableContent(empty)).toBe(false);
    expect(pageToPromptText(empty)).toContain("Texte de la page");
  });
});

describe("decodeEntities", () => {
  it("décode les entités nommées et numériques, et laisse les inconnues", () => {
    expect(decodeEntities("Sel &amp; poivre &#8211; &inconnue;")).toBe("Sel & poivre – &inconnue;");
  });
});
