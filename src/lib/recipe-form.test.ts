import { describe, expect, it } from "vitest";
import { formToRecipeInput, type RecipeFormState } from "@/lib/recipe-form";

const ITEM = "3f1b8c2e-1d4a-4b6e-9c3a-2b7d5e8f9a10";
const base: RecipeFormState = {
  title: "Gratin",
  servings: 4,
  ingredients: [],
  steps: [],
  bookTitle: "",
  bookPageText: "",
  collectionIds: [],
};
const line = (overrides: Partial<RecipeFormState["ingredients"][number]>) => ({
  key: "a",
  itemId: ITEM,
  itemName: "Pomme de terre",
  quantityText: "1",
  unit: "kg",
  note: "",
  ...overrides,
});

describe("formToRecipeInput", () => {
  it("convertit une ligne complète", () => {
    const result = formToRecipeInput({ ...base, ingredients: [line({ quantityText: "1,5" })] });
    expect(result).toMatchObject({
      ok: true,
      data: { ingredients: [{ itemId: ITEM, quantity: 1.5, unit: "kg" }] },
    });
  });

  it("transforme une ligne sans quantité en « au goût »", () => {
    const result = formToRecipeInput({
      ...base,
      ingredients: [line({ quantityText: "", unit: "pincee" })],
    });
    expect(result).toMatchObject({
      ok: true,
      data: { ingredients: [{ quantity: null, unit: null }] },
    });
  });

  it("ignore les lignes vides", () => {
    const result = formToRecipeInput({
      ...base,
      ingredients: [line({ itemId: null, itemName: "", quantityText: "" })],
    });
    expect(result).toMatchObject({ ok: true, data: { ingredients: [] } });
  });

  it("signale une ligne sans article", () => {
    const result = formToRecipeInput({ ...base, ingredients: [line({ itemId: null })] });
    expect(result).toEqual({
      ok: false,
      errors: { "ingredient-a": "Choisissez un article dans la liste" },
    });
  });

  it("signale une quantité sans unité ou invalide", () => {
    expect(formToRecipeInput({ ...base, ingredients: [line({ unit: "" })] })).toMatchObject({
      ok: false,
    });
    expect(
      formToRecipeInput({ ...base, ingredients: [line({ quantityText: "beaucoup" })] }),
    ).toMatchObject({
      ok: false,
    });
  });

  it("valide le titre et le numéro de page", () => {
    const result = formToRecipeInput({ ...base, title: " ", bookPageText: "douze" });
    expect(result).toEqual({
      ok: false,
      errors: { title: "Le titre est obligatoire", bookPage: "Numéro de page invalide" },
    });
  });
});
