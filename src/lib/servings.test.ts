import { describe, expect, it } from "vitest";
import { scaleIngredients, scaleQuantity } from "@/lib/servings";

describe("scaleQuantity", () => {
  it("augmente la quantité quand on passe de 4 à 6 personnes", () => {
    expect(scaleQuantity(200, 4, 6)).toBe(300);
  });

  it("diminue la quantité quand on passe de 4 à 2 personnes", () => {
    expect(scaleQuantity(3, 4, 2)).toBe(1.5);
  });

  it("arrondit à 2 décimales", () => {
    expect(scaleQuantity(1, 3, 1)).toBe(0.33);
  });

  it("refuse une recette pour 0 personne", () => {
    expect(() => scaleQuantity(100, 0, 4)).toThrow();
  });
});

describe("scaleIngredients", () => {
  const ingredients = [
    { name: "Farine", quantity: 200, unit: "g" },
    { name: "Sel", quantity: null, unit: null },
    { name: "Œuf", quantity: 3, unit: "piece" },
  ];

  it("recalcule chaque quantité et garde les autres champs", () => {
    expect(scaleIngredients(ingredients, 4, 6)).toEqual([
      { name: "Farine", quantity: 300, unit: "g" },
      { name: "Sel", quantity: null, unit: null },
      { name: "Œuf", quantity: 4.5, unit: "piece" },
    ]);
  });

  it("laisse les ingrédients « au goût » sans quantité", () => {
    expect(scaleIngredients(ingredients, 4, 2)[1].quantity).toBeNull();
  });

  it("ne change rien pour le même nombre de personnes", () => {
    expect(scaleIngredients(ingredients, 4, 4)).toEqual(ingredients);
  });

  it("ne modifie pas la liste d'origine", () => {
    scaleIngredients(ingredients, 4, 8);
    expect(ingredients[0].quantity).toBe(200);
  });
});
