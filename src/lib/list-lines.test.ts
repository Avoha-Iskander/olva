import { describe, expect, it } from "vitest";

import {
  consolidateLines,
  type DraftLine,
  type ExistingLine,
  findMergeTarget,
  planAddition,
} from "@/lib/list-lines";

const line = (overrides: Partial<DraftLine>): DraftLine => ({
  itemId: "lait",
  origin: "recipe",
  quantity: 1,
  unit: "l",
  included: true,
  recipeIds: [],
  ...overrides,
});

describe("consolidateLines — une ligne par article (US-LST-05)", () => {
  it("additionne la recette et la pré-liste (1 l + 2 l = 3 l)", () => {
    const result = consolidateLines([
      line({ quantity: 1, recipeIds: ["crepes"] }),
      line({ origin: "prelist", quantity: 2 }),
    ]);
    expect(result).toEqual([
      { itemId: "lait", origin: "recipe", quantity: 3, unit: "l", recipeIds: ["crepes"] },
    ]);
  });

  it("convertit avant d'additionner (50 cl + 1 l = 1,5 l)", () => {
    const result = consolidateLines([
      line({ quantity: 1, unit: "l", origin: "prelist" }),
      line({ quantity: 50, unit: "cl" }),
    ]);
    expect(result[0]).toMatchObject({ quantity: 1.5, unit: "l", origin: "recipe" });
  });

  it("garde des lignes séparées sans conversion possible", () => {
    const result = consolidateLines([
      line({ itemId: "farine", quantity: 500, unit: "g" }),
      line({ itemId: "farine", origin: "free", quantity: 1, unit: "paquet" }),
    ]);
    expect(result).toHaveLength(2);
  });

  it("utilise les conversions de l'article (1 boîte = 250 g)", () => {
    const conversions = new Map([["tomate", [{ fromUnit: "boite", toUnit: "g", factor: 250 }]]]);
    const result = consolidateLines(
      [
        line({ itemId: "tomate", quantity: 100, unit: "g" }),
        line({ itemId: "tomate", origin: "free", quantity: 1, unit: "boite" }),
      ],
      conversions,
    );
    expect(result).toEqual([
      expect.objectContaining({ itemId: "tomate", quantity: 350, unit: "g" }),
    ]);
  });

  it("ignore les lignes retirées et les ingrédients de base non cochés", () => {
    const result = consolidateLines([
      line({ itemId: "huile", origin: "staple", unit: "bouteille", included: false }),
      line({ itemId: "sel", origin: "staple", unit: "paquet", included: true }),
    ]);
    expect(result.map((r) => r.itemId)).toEqual(["sel"]);
  });

  it("passe en kg au-delà de 1 000 g et arrondit les pièces au supérieur", () => {
    const result = consolidateLines([
      line({ itemId: "farine", quantity: 800, unit: "g" }),
      line({ itemId: "farine", origin: "prelist", quantity: 400, unit: "g" }),
      line({ itemId: "oeuf", quantity: 1.5, unit: "piece" }),
    ]);
    expect(result).toEqual([
      expect.objectContaining({ itemId: "farine", quantity: 1.2, unit: "kg" }),
      expect.objectContaining({ itemId: "oeuf", quantity: 2, unit: "piece" }),
    ]);
  });

  it("réunit les recettes d'origine sans doublon", () => {
    const result = consolidateLines([
      line({ recipeIds: ["a", "b"] }),
      line({ recipeIds: ["b", "c"] }),
    ]);
    expect(result[0].recipeIds).toEqual(["a", "b", "c"]);
  });
});

describe("findMergeTarget — ajout d'un article sur la page de la liste", () => {
  const lines = [
    { itemId: "lait", unit: "l" },
    { itemId: "farine", unit: "kg" },
  ];

  it("augmente la ligne existante si l'unité est compatible", () => {
    expect(findMergeTarget(lines, "farine", 500, "g")).toEqual({ index: 1, added: 0.5 });
  });

  it("propose une nouvelle ligne sinon", () => {
    expect(findMergeTarget(lines, "farine", 1, "paquet")).toBeNull();
    expect(findMergeTarget(lines, "sucre", 1, "kg")).toBeNull();
  });
});

describe("planAddition (US-MEN-03 : ajouter une recette à une liste prête)", () => {
  const line = (over: Partial<ExistingLine>): ExistingLine => ({
    id: "l1",
    itemId: "farine",
    quantity: 500,
    unit: "g",
    included: true,
    checked: false,
    recipeIds: ["crepes"],
    ...over,
  });

  it("additionne sur la ligne existante, même dans une autre unité convertible", () => {
    const plan = planAddition(
      [line({})],
      [{ itemId: "farine", quantity: 0.25, unit: "kg", recipeIds: ["gateau"] }],
    );
    expect(plan.updates).toEqual([{ id: "l1", quantity: 750, recipeIds: ["crepes", "gateau"] }]);
    expect(plan.inserts).toEqual([]);
  });

  it("n'augmente pas un article déjà coché (déjà dans le panier) : nouvelle ligne", () => {
    const plan = planAddition(
      [line({ checked: true })],
      [{ itemId: "farine", quantity: 200, unit: "g", recipeIds: ["gateau"] }],
    );
    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toEqual([
      { itemId: "farine", quantity: 200, unit: "g", recipeIds: ["gateau"] },
    ]);
  });

  it("ignore les lignes retirées de la liste", () => {
    const plan = planAddition(
      [line({ included: false })],
      [{ itemId: "farine", quantity: 200, unit: "g", recipeIds: ["gateau"] }],
    );
    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toHaveLength(1);
  });

  it("sans conversion possible : une nouvelle ligne (jamais d'addition fausse)", () => {
    const plan = planAddition(
      [line({ itemId: "tomate", unit: "g", quantity: 300 })],
      [{ itemId: "tomate", quantity: 2, unit: "piece", recipeIds: ["salade"] }],
    );
    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toEqual([
      { itemId: "tomate", quantity: 2, unit: "piece", recipeIds: ["salade"] },
    ]);
  });

  it("utilise les conversions de l'article (1 boîte = 250 g)", () => {
    const conversions = new Map([["tomate", [{ fromUnit: "boite", toUnit: "g", factor: 250 }]]]);
    const plan = planAddition(
      [line({ itemId: "tomate", unit: "g", quantity: 250 })],
      [{ itemId: "tomate", quantity: 1, unit: "boite", recipeIds: ["sauce"] }],
      conversions,
    );
    expect(plan.updates).toEqual([{ id: "l1", quantity: 500, recipeIds: ["crepes", "sauce"] }]);
  });

  it("article absent : nouvelle ligne, au format d'affichage (1 200 g → 1,2 kg)", () => {
    const plan = planAddition(
      [],
      [{ itemId: "sucre", quantity: 1200, unit: "g", recipeIds: ["gateau"] }],
    );
    expect(plan.inserts).toEqual([
      { itemId: "sucre", quantity: 1.2, unit: "kg", recipeIds: ["gateau"] },
    ]);
  });

  it("arrondit les pièces au supérieur (1,5 œuf → 2)", () => {
    const plan = planAddition(
      [line({ itemId: "oeuf", unit: "piece", quantity: 3 })],
      [{ itemId: "oeuf", quantity: 1.5, unit: "piece", recipeIds: ["gateau"] }],
    );
    expect(plan.updates).toEqual([{ id: "l1", quantity: 5, recipeIds: ["crepes", "gateau"] }]);
  });
});
