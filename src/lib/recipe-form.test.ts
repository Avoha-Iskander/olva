import { describe, expect, it } from "vitest";
import { formToRecipeInput, type RecipeFormState, unitForChosenItem } from "@/lib/recipe-form";

const ITEM = "3f1b8c2e-1d4a-4b6e-9c3a-2b7d5e8f9a10";
const base: RecipeFormState = {
  title: "Gratin",
  servings: 4,
  ingredients: [],
  steps: [],
  notes: "",
  bookTitle: "",
  bookPageText: "",
  sourceUrl: "",
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

describe("unitForChosenItem", () => {
  it("garde l'unité déjà présente sur la ligne (ex. lue sur la recette)", () => {
    expect(unitForChosenItem("cas", "g")).toBe("cas");
  });

  it("propose l'unité habituelle de l'article si la ligne n'en a pas", () => {
    expect(unitForChosenItem("", "g")).toBe("g");
  });
});

describe("formToRecipeInput — lien de la page", () => {
  const withLink = (sourceUrl: string) => formToRecipeInput({ ...base, sourceUrl });

  it("accepte un lien https, et aucun lien", () => {
    expect(withLink("https://www.marmiton.org/recettes/tarte")).toMatchObject({
      ok: true,
      data: { sourceUrl: "https://www.marmiton.org/recettes/tarte" },
    });
    expect(withLink("  ")).toMatchObject({ ok: true, data: { sourceUrl: null } });
  });

  it("complète un lien collé sans https://", () => {
    expect(withLink("marmiton.org/recettes/tarte")).toMatchObject({
      ok: true,
      data: { sourceUrl: "https://marmiton.org/recettes/tarte" },
    });
  });

  it("refuse un lien qui n'est pas une page web", () => {
    expect(withLink("javascript:alert(1)")).toMatchObject({ ok: false });
    expect(withLink("ftp://exemple.fr/x")).toMatchObject({ ok: false });
  });
});

describe("formToRecipeInput — notes (US-REC-08)", () => {
  it("garde les notes, sans espaces autour, et null quand il n'y en a pas", () => {
    const withNotes = formToRecipeInput({ ...base, notes: "  Doubler le fromage.\n" });
    expect(withNotes).toMatchObject({ ok: true, data: { notes: "Doubler le fromage." } });
    const empty = formToRecipeInput({ ...base, notes: "   " });
    expect(empty).toMatchObject({ ok: true, data: { notes: null } });
  });

  it("refuse des notes trop longues", () => {
    const result = formToRecipeInput({ ...base, notes: "a".repeat(2001) });
    expect(result).toMatchObject({ ok: false, errors: { notes: "2 000 caractères maximum" } });
  });
});
