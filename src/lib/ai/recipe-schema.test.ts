import { describe, expect, it } from "vitest";
import { parseExtraction } from "@/lib/ai/recipe-schema";

const valid = {
  is_recipe: true,
  title: "Quiche lorraine",
  servings: 6,
  ingredients: [
    { name: "Lardon", quantity: 200, unit: "g", note: null },
    { name: "Œuf", quantity: 3, unit: null },
    { name: "Muscade", quantity: null, unit: "pincee" },
  ],
  steps: ["Préchauffer le four.", "Cuire 35 min."],
};

describe("parseExtraction", () => {
  it("accepte une réponse valide", () => {
    const result = parseExtraction(valid);
    expect(result.ok).toBe(true);
  });

  it("met « pièce » à une quantité sans unité, retire l'unité d'un « au goût »", () => {
    const result = parseExtraction(valid);
    if (!result.ok) throw new Error(result.error);
    expect(result.recipe.ingredients[1]).toMatchObject({ quantity: 3, unit: "piece" });
    expect(result.recipe.ingredients[2]).toMatchObject({ quantity: null, unit: null });
  });

  it("complète les valeurs absentes (pas d'incertitude, pas d'étapes)", () => {
    const result = parseExtraction({ is_recipe: true, title: "Salade" });
    if (!result.ok) throw new Error(result.error);
    expect(result.recipe).toMatchObject({ title_uncertain: false, ingredients: [], steps: [] });
  });

  it("lit le numéro de la photo de couverture, et ignore un numéro impossible", () => {
    const result = parseExtraction({ ...valid, cover_page: 2 });
    if (!result.ok) throw new Error(result.error);
    expect(result.recipe.cover_page).toBe(2);
    // Numéro impossible : retiré, la recette est gardée (correctif du 13/11)
    expect(parseExtraction({ ...valid, cover_page: 0 })).toMatchObject({
      ok: true,
      recipe: { cover_page: null },
    });
  });

  it("n'accepte jamais une unité inventée telle quelle : retirée et ingrédient à vérifier", () => {
    expect(
      parseExtraction({ ...valid, ingredients: [{ name: "Lait", quantity: 1, unit: "tasse" }] }),
    ).toMatchObject({
      ok: true,
      recipe: { ingredients: [{ name: "Lait", unit: "piece", note: "tasse", uncertain: true }] },
    });
  });

  it("n'accepte jamais une quantité négative : elle devient « au goût »", () => {
    expect(
      parseExtraction({ ...valid, ingredients: [{ name: "Lait", quantity: -1, unit: "l" }] }),
    ).toMatchObject({ ok: true, recipe: { ingredients: [{ quantity: null, unit: null }] } });
  });

  it("refuse une réponse vraiment mal formée", () => {
    expect(parseExtraction({ ingredients: "du lait" }).ok).toBe(false);
    expect(parseExtraction({ is_recipe: "oui" }).ok).toBe(false);
  });

  it("accepte « ce n'est pas une recette » avec une raison", () => {
    const result = parseExtraction({ is_recipe: false, reason: "Une photo de chat" });
    expect(result).toMatchObject({
      ok: true,
      recipe: { is_recipe: false, reason: "Une photo de chat" },
    });
  });

  it("refuse une réponse qui n'est pas un objet", () => {
    expect(parseExtraction("du texte").ok).toBe(false);
  });
});
