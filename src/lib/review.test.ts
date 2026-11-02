import { describe, expect, it } from "vitest";

import {
  adjustLine,
  computeReview,
  formatRequested,
  normalizeUnit,
  setLineQuantity,
  setLineUnit,
  mergeReview,
  quantityStep,
  type ReviewItem,
  roundForList,
  type SelectedRecipe,
  stepQuantity,
  toDisplayUnit,
} from "@/lib/review";

// Petit catalogue de test (positions de rayon : fruits/légumes 1, crèmerie 6, épicerie 12…)
const catalogue: ReviewItem[] = [
  {
    id: "farine",
    name: "Farine",
    aislePosition: 12,
    defaultUnit: "g",
    isStaple: false,
    purchaseUnit: null,
    conversions: [],
  },
  {
    id: "lait",
    name: "Lait",
    aislePosition: 6,
    defaultUnit: "l",
    isStaple: false,
    purchaseUnit: null,
    conversions: [],
  },
  {
    id: "oeuf",
    name: "Œuf",
    aislePosition: 6,
    defaultUnit: "piece",
    isStaple: false,
    purchaseUnit: null,
    conversions: [],
  },
  {
    id: "persil",
    name: "Persil frais",
    aislePosition: 1,
    defaultUnit: "botte",
    isStaple: false,
    purchaseUnit: null,
    conversions: [],
  },
  {
    id: "huile",
    name: "Huile d'olive",
    aislePosition: 10,
    defaultUnit: "cas",
    isStaple: true,
    purchaseUnit: "bouteille",
    conversions: [],
  },
  {
    id: "sel",
    name: "Sel",
    aislePosition: 11,
    defaultUnit: "pincee",
    isStaple: true,
    purchaseUnit: "paquet",
    conversions: [],
  },
  {
    id: "tomate-cerise",
    name: "Tomate cerise",
    aislePosition: 1,
    defaultUnit: "g",
    isStaple: false,
    purchaseUnit: null,
    conversions: [{ fromUnit: "boite", toUnit: "g", factor: 250 }],
  },
  {
    id: "ail",
    name: "Ail",
    aislePosition: 1,
    defaultUnit: "gousse",
    isStaple: false,
    purchaseUnit: null,
    conversions: [],
  },
];
const items = new Map(catalogue.map((i) => [i.id, i]));

const recipe = (
  recipeId: string,
  servings: number,
  ingredients: SelectedRecipe["ingredients"],
  baseServings = 4,
): SelectedRecipe => ({ recipeId, baseServings, servings, ingredients });

const line = (lines: ReturnType<typeof computeReview>, key: string) =>
  lines.find((l) => l.key === key);

describe("computeReview — quantités et portions", () => {
  it("recalcule selon les portions choisies (recette pour 4, liste pour 6)", () => {
    const lines = computeReview(
      [recipe("crepes", 6, [{ itemId: "farine", quantity: 200, unit: "g" }])],
      items,
    );
    expect(line(lines, "farine:g")).toMatchObject({ quantity: 300, unit: "g", section: "main" });
  });

  it("additionne un même article venant de plusieurs recettes (US-LST-05)", () => {
    const lines = computeReview(
      [
        recipe("crepes", 4, [{ itemId: "farine", quantity: 250, unit: "g" }]),
        recipe("gateau", 4, [{ itemId: "farine", quantity: 0.2, unit: "kg" }]),
      ],
      items,
    );
    const farine = line(lines, "farine:g");
    expect(farine?.quantity).toBe(450);
    expect(farine?.recipeIds).toEqual(["crepes", "gateau"]);
  });

  it("convertit dans l'unité de l'article (cl → l)", () => {
    const lines = computeReview(
      [recipe("crepes", 4, [{ itemId: "lait", quantity: 50, unit: "cl" }])],
      items,
    );
    expect(line(lines, "lait:l")).toMatchObject({ quantity: 0.5, unit: "l" });
  });

  it("affiche en kg au-delà de 1 000 g", () => {
    const lines = computeReview(
      [recipe("pain", 8, [{ itemId: "farine", quantity: 600, unit: "g" }])],
      items,
    );
    expect(line(lines, "farine:g")).toMatchObject({ quantity: 1.2, unit: "kg" });
  });

  it("utilise les conversions propres à l'article (1 boîte de tomates cerises = 250 g)", () => {
    const lines = computeReview(
      [
        recipe("salade", 4, [{ itemId: "tomate-cerise", quantity: 1, unit: "boite" }]),
        recipe("tarte", 4, [{ itemId: "tomate-cerise", quantity: 100, unit: "g" }]),
      ],
      items,
    );
    expect(line(lines, "tomate-cerise:g")?.quantity).toBe(350);
  });

  it("garde des lignes séparées sans conversion possible (jamais d'addition fausse)", () => {
    const lines = computeReview(
      [
        recipe("a", 4, [{ itemId: "ail", quantity: 2, unit: "gousse" }]),
        recipe("b", 4, [{ itemId: "ail", quantity: 1, unit: "cac" }]),
      ],
      items,
    );
    expect(line(lines, "ail:gousse")?.quantity).toBe(2);
    expect(line(lines, "ail:cac")?.quantity).toBe(1);
  });

  it("arrondit les pièces au supérieur (1,5 œuf → 2)", () => {
    const lines = computeReview(
      [recipe("quiche", 2, [{ itemId: "oeuf", quantity: 3, unit: "piece" }])],
      items,
    );
    expect(line(lines, "oeuf:piece")?.quantity).toBe(2);
  });

  it("ignore une recette sans portions ou un article inconnu", () => {
    const lines = computeReview(
      [
        recipe("vide", 0, [{ itemId: "farine", quantity: 100, unit: "g" }]),
        recipe("ok", 4, [{ itemId: "inconnu", quantity: 1, unit: "piece" }]),
      ],
      items,
    );
    expect(lines).toEqual([]);
  });
});

describe("computeReview — ingrédients de base et « au goût »", () => {
  it("un ingrédient de base vaut 1 conditionnement, décoché, en bas", () => {
    const lines = computeReview(
      [
        recipe("a", 4, [{ itemId: "huile", quantity: 3, unit: "cas" }]),
        recipe("b", 8, [{ itemId: "huile", quantity: 2, unit: "cas" }]),
      ],
      items,
    );
    expect(line(lines, "huile:staple")).toMatchObject({
      section: "staple",
      quantity: 1,
      unit: "bouteille",
      includedByDefault: false,
      recipeIds: ["a", "b"],
    });
  });

  it("un ingrédient de base « au goût » devient son conditionnement (Sel : 1 paquet)", () => {
    const lines = computeReview(
      [recipe("a", 4, [{ itemId: "sel", quantity: null, unit: null }])],
      items,
    );
    expect(line(lines, "sel:staple")).toMatchObject({
      quantity: 1,
      unit: "paquet",
      includedByDefault: false,
    });
  });

  it("un autre ingrédient « au goût » devient 1 unité par défaut, coché (Persil : 1 botte)", () => {
    const lines = computeReview(
      [recipe("a", 4, [{ itemId: "persil", quantity: null, unit: null }])],
      items,
    );
    expect(line(lines, "persil:botte")).toMatchObject({
      quantity: 1,
      unit: "botte",
      includedByDefault: true,
    });
  });

  it("« au goût » n'ajoute rien si une autre recette en demande déjà une quantité", () => {
    const lines = computeReview(
      [
        recipe("a", 4, [{ itemId: "persil", quantity: null, unit: null }]),
        recipe("b", 4, [{ itemId: "persil", quantity: 2, unit: "botte" }]),
      ],
      items,
    );
    expect(lines.filter((l) => l.itemId === "persil")).toHaveLength(1);
    expect(line(lines, "persil:botte")).toMatchObject({ quantity: 2, recipeIds: ["b", "a"] });
  });

  it("trie par rayon, puis alphabétiquement, ingrédients de base à la fin", () => {
    const lines = computeReview(
      [
        recipe("a", 4, [
          { itemId: "huile", quantity: 1, unit: "cas" },
          { itemId: "farine", quantity: 100, unit: "g" },
          { itemId: "oeuf", quantity: 2, unit: "piece" },
          { itemId: "persil", quantity: 1, unit: "botte" },
          { itemId: "lait", quantity: 1, unit: "l" },
        ]),
      ],
      items,
    );
    expect(lines.map((l) => l.name)).toEqual([
      "Persil frais",
      "Lait",
      "Œuf",
      "Farine",
      "Huile d'olive",
    ]);
  });
});

describe("mergeReview — retour à l'étape 1", () => {
  const first = (recipes: SelectedRecipe[]) => mergeReview([], computeReview(recipes, items));
  const crepes4 = recipe("crepes", 4, [
    { itemId: "farine", quantity: 250, unit: "g" },
    { itemId: "lait", quantity: 0.5, unit: "l" },
    { itemId: "huile", quantity: 1, unit: "cas" },
  ]);

  it("premier calcul : rien n'est signalé, les ingrédients de base sont décochés", () => {
    const review = first([crepes4]);
    expect(review.every((l) => !l.changed && !l.adjusted)).toBe(true);
    expect(review.find((l) => l.itemId === "farine")?.included).toBe(true);
    expect(review.find((l) => l.itemId === "huile")?.included).toBe(false);
  });

  it("garde mon ajustement si l'ingrédient n'a pas changé", () => {
    const review = first([crepes4]).map((l) => (l.itemId === "farine" ? adjustLine(l, 500) : l));
    const withOmelette = [
      crepes4,
      recipe("omelette", 4, [{ itemId: "oeuf", quantity: 3, unit: "piece" }]),
    ];
    const merged = mergeReview(review, computeReview(withOmelette, items));
    expect(merged.find((l) => l.itemId === "farine")).toMatchObject({
      quantity: 500,
      adjusted: true,
      changed: false,
    });
  });

  it("signale une ligne nouvelle (recette ajoutée)", () => {
    const merged = mergeReview(
      first([crepes4]),
      computeReview(
        [crepes4, recipe("omelette", 4, [{ itemId: "oeuf", quantity: 3, unit: "piece" }])],
        items,
      ),
    );
    expect(merged.find((l) => l.itemId === "oeuf")?.changed).toBe(true);
    expect(merged.find((l) => l.itemId === "farine")?.changed).toBe(false);
  });

  it("recalcule et signale un ingrédient dont la quantité change (portions modifiées)", () => {
    const review = first([crepes4]).map((l) => (l.itemId === "farine" ? adjustLine(l, 500) : l));
    const crepes8 = { ...crepes4, servings: 8 };
    const merged = mergeReview(review, computeReview([crepes8], items));
    expect(merged.find((l) => l.itemId === "farine")).toMatchObject({
      quantity: 500, // 250 g pour 4 → 500 g pour 8 : nouveau calcul
      adjusted: false,
      changed: true,
    });
    expect(merged.find((l) => l.itemId === "lait")).toMatchObject({ quantity: 1, changed: true });
  });

  it("ne fait pas réapparaître une ligne retirée", () => {
    const review = first([crepes4]).map((l) =>
      l.itemId === "lait" ? { ...l, included: false } : l,
    );
    const merged = mergeReview(review, computeReview([{ ...crepes4, servings: 6 }], items));
    expect(merged.find((l) => l.itemId === "lait")?.included).toBe(false);
  });

  it("garde un ingrédient de base que j'ai coché", () => {
    const review = first([crepes4]).map((l) =>
      l.itemId === "huile" ? { ...l, included: true } : l,
    );
    const merged = mergeReview(review, computeReview([{ ...crepes4, servings: 2 }], items));
    expect(merged.find((l) => l.itemId === "huile")).toMatchObject({
      included: true,
      changed: false,
    });
  });

  it("supprime les lignes d'une recette retirée", () => {
    const merged = mergeReview(first([crepes4]), computeReview([], items));
    expect(merged).toEqual([]);
  });

  it("reconnaît une même quantité passée de g à kg (pas de faux signalement)", () => {
    const big = recipe("pain", 4, [{ itemId: "farine", quantity: 1000, unit: "g" }]);
    const review = first([big]);
    const merged = mergeReview(review, computeReview([big], items));
    expect(merged[0]).toMatchObject({ quantity: 1, unit: "kg", changed: false });
  });
});

describe("arrondis, unités d'affichage et boutons « − + »", () => {
  it("arrondit les unités de comptage au supérieur, pas les autres", () => {
    expect(roundForList(1.2, "boite")).toBe(2);
    expect(roundForList(2.0000000001, "piece")).toBe(2);
    expect(roundForList(1.234, "kg")).toBe(1.23);
  });

  it("passe en kg et l au-delà de 1 000", () => {
    expect(toDisplayUnit(1500, "ml")).toEqual({ quantity: 1.5, unit: "l" });
    expect(toDisplayUnit(999, "g")).toEqual({ quantity: 999, unit: "g" });
  });

  it("choisit le pas selon l'unité", () => {
    expect(quantityStep("g")).toBe(50);
    expect(quantityStep("cl")).toBe(10);
    expect(quantityStep("kg")).toBe(0.5);
    expect(quantityStep("piece")).toBe(1);
  });

  it("ne descend jamais à 0", () => {
    expect(stepQuantity(300, "g", -1)).toBe(250);
    expect(stepQuantity(30, "g", -1)).toBe(30);
    expect(stepQuantity(1, "piece", -1)).toBe(1);
    expect(stepQuantity(1.5, "kg", 1)).toBe(2);
  });

  it("marque une ligne ajustée et retire le signalement", () => {
    const [l] = mergeReview(
      [],
      computeReview([recipe("a", 4, [{ itemId: "farine", quantity: 100, unit: "g" }])], items),
    );
    expect(adjustLine({ ...l, changed: true }, 150)).toMatchObject({
      quantity: 150,
      adjusted: true,
      changed: false,
    });
  });
});

describe("améliorations demandées par Alex (02/11)", () => {
  it("ingrédient de base : garde la quantité réellement demandée (Huile : 3 + 4 = 7 c. à soupe)", () => {
    const lines = computeReview(
      [
        recipe("a", 4, [{ itemId: "huile", quantity: 3, unit: "cas" }]),
        recipe("b", 8, [{ itemId: "huile", quantity: 2, unit: "cas" }]),
      ],
      items,
    );
    const huile = line(lines, "huile:staple")!;
    expect(huile.requested).toEqual([{ quantity: 7, unit: "cas" }]); // 3 (pour 4) + 2 × 8/4
    expect(huile.quantity).toBe(1); // toujours 1 bouteille proposée
    expect(formatRequested(huile)).toBe("7 c. à soupe");
  });

  it("ingrédient de base : quantité + « au goût » quand les recettes diffèrent", () => {
    const lines = computeReview(
      [
        recipe("a", 4, [{ itemId: "sel", quantity: 2, unit: "pincee" }]),
        recipe("b", 4, [{ itemId: "sel", quantity: null, unit: null }]),
      ],
      items,
    );
    expect(formatRequested(line(lines, "sel:staple")!)).toBe("2 pincée + au goût");
  });

  it("ingrédient de base seulement « au goût »", () => {
    const lines = computeReview(
      [recipe("a", 4, [{ itemId: "sel", quantity: null, unit: null }])],
      items,
    );
    expect(formatRequested(line(lines, "sel:staple")!)).toBe("au goût");
  });

  it("passe en kg quand on ajuste 900 g à 1 200 g, et revient en g sous 1 kg", () => {
    expect(normalizeUnit(1200, "g")).toEqual({ quantity: 1.2, unit: "kg" });
    expect(normalizeUnit(0.5, "kg")).toEqual({ quantity: 500, unit: "g" });
    expect(normalizeUnit(1500, "ml")).toEqual({ quantity: 1.5, unit: "l" });
    expect(normalizeUnit(900, "g")).toEqual({ quantity: 900, unit: "g" });
  });

  it("setLineQuantity ajuste et change d'unité si besoin", () => {
    const [farine] = mergeReview(
      [],
      computeReview([recipe("a", 4, [{ itemId: "farine", quantity: 900, unit: "g" }])], items),
    );
    expect(setLineQuantity(farine, 1200)).toMatchObject({
      quantity: 1.2,
      unit: "kg",
      adjusted: true,
    });
  });

  it("setLineUnit convertit quand c'est possible, sinon garde le nombre", () => {
    const [farine] = mergeReview(
      [],
      computeReview([recipe("a", 8, [{ itemId: "farine", quantity: 600, unit: "g" }])], items),
    );
    expect(farine).toMatchObject({ quantity: 1.2, unit: "kg" });
    expect(setLineUnit(farine, "g")).toMatchObject({ quantity: 1200, unit: "g", adjusted: true });
    expect(setLineUnit(farine, "paquet")).toMatchObject({ quantity: 1.2, unit: "paquet" });
  });

  it("garde l'unité choisie après un recalcul si l'ingrédient n'a pas changé", () => {
    const selection = [recipe("a", 4, [{ itemId: "farine", quantity: 500, unit: "g" }])];
    const review = mergeReview([], computeReview(selection, items)).map((l) =>
      setLineUnit(l, "paquet"),
    );
    const merged = mergeReview(
      review.map((l) => ({ ...l, quantity: 1 })),
      computeReview(selection, items),
    );
    expect(merged[0]).toMatchObject({ quantity: 1, unit: "paquet", adjusted: true });
  });
});
