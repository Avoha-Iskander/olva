import { describe, expect, it } from "vitest";
import { recipeSchema } from "@/lib/validation/recipe";

const ITEM = "3f1b8c2e-1d4a-4b6e-9c3a-2b7d5e8f9a10";

const valid = {
  title: "  Gratin dauphinois ",
  servings: 4,
  ingredients: [
    { itemId: ITEM, quantity: 1, unit: "kg", note: "à chair ferme" },
    { itemId: ITEM, quantity: null, unit: null }, // sel « au goût »
  ],
  steps: ["Éplucher les pommes de terre", "  ", "Cuire 1 h à 180 °C"],
};

describe("recipeSchema", () => {
  it("accepte une recette valide, nettoie le titre et retire les étapes vides", () => {
    const result = recipeSchema.parse(valid);
    expect(result.title).toBe("Gratin dauphinois");
    expect(result.steps).toEqual(["Éplucher les pommes de terre", "Cuire 1 h à 180 °C"]);
    expect(result.collectionIds).toEqual([]);
  });

  it("accepte un ingrédient « au goût » (ni quantité ni unité)", () => {
    expect(recipeSchema.safeParse(valid).success).toBe(true);
  });

  it("refuse une quantité sans unité", () => {
    const result = recipeSchema.safeParse({
      ...valid,
      ingredients: [{ itemId: ITEM, quantity: 2, unit: null }],
    });
    expect(result.success).toBe(false);
  });

  it("refuse une unité inconnue", () => {
    const result = recipeSchema.safeParse({
      ...valid,
      ingredients: [{ itemId: ITEM, quantity: 2, unit: "tasse" }],
    });
    expect(result.success).toBe(false);
  });

  it("exige un titre et un nombre de personnes valide", () => {
    expect(recipeSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(recipeSchema.safeParse({ ...valid, servings: 0 }).success).toBe(false);
  });

  it("accepte une recette sans ingrédient ni étape (brouillon)", () => {
    expect(
      recipeSchema.safeParse({ title: "Idée", servings: 2, ingredients: [], steps: [] }).success,
    ).toBe(true);
  });
});
