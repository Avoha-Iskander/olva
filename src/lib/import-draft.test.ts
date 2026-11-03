import { describe, expect, it } from "vitest";

import {
  countHighlights,
  draftToForm,
  type ImportDraft,
  importPagesForRecipe,
} from "@/lib/import-draft";

const draft = (patch: Partial<ImportDraft> = {}): ImportDraft => ({
  importId: "imp-1",
  photoPaths: ["u/r/import-1.webp"],
  sourceUrl: null,
  photo: null,
  title: "Tarte aux pommes",
  titleUncertain: false,
  servings: 6,
  servingsUncertain: false,
  steps: ["Étaler la pâte.", "Cuire 35 min."],
  bookPage: 42,
  ingredients: [
    {
      name: "Pomme",
      itemId: "item-pomme",
      quantity: 4,
      unit: "piece",
      note: "bien mûres",
      uncertain: false,
    },
    {
      name: "Sucre",
      itemId: "item-sucre",
      quantity: 0.5,
      unit: "kg",
      note: null,
      uncertain: false,
    },
  ],
  ...patch,
});

describe("draftToForm", () => {
  it("pré-remplit le formulaire avec la recette lue", () => {
    const { state, highlights } = draftToForm(draft(), 4);
    expect(state).toMatchObject({
      title: "Tarte aux pommes",
      servings: 6,
      steps: ["Étaler la pâte.", "Cuire 35 min."],
      bookPageText: "42",
    });
    expect(state.ingredients[0]).toMatchObject({
      itemId: "item-pomme",
      quantityText: "4",
      unit: "piece",
      note: "bien mûres",
    });
    // Quantité décimale au format français
    expect(state.ingredients[1].quantityText).toBe("0,5");
    expect(countHighlights(highlights)).toBe(0);
  });

  it("surligne un titre douteux ou absent", () => {
    expect(draftToForm(draft({ titleUncertain: true }), 4).highlights.title).toBe(true);
    expect(draftToForm(draft({ title: "" }), 4).highlights.title).toBe(true);
  });

  it("sans nombre de personnes, part des portions par défaut et le surligne", () => {
    const { state, highlights } = draftToForm(draft({ servings: null }), 4);
    expect(state.servings).toBe(4);
    expect(highlights.servings).toBe(true);
  });

  it("surligne un ingrédient non reconnu, avec le nom lu", () => {
    const d = draft();
    d.ingredients[1] = { ...d.ingredients[1], name: "Sucre muscovado", itemId: null };
    const { state, highlights } = draftToForm(d, 4);
    const key = state.ingredients[1].key;
    expect(state.ingredients[1].itemId).toBeNull();
    expect(highlights.ingredients[key]).toEqual({
      readName: "Sucre muscovado",
      uncertain: false,
      unrecognized: true,
    });
    expect(countHighlights(highlights)).toBe(1);
  });

  it("surligne un ingrédient à la lecture douteuse, même reconnu", () => {
    const d = draft();
    d.ingredients[0] = { ...d.ingredients[0], uncertain: true };
    const { state, highlights } = draftToForm(d, 4);
    expect(highlights.ingredients[state.ingredients[0].key]).toMatchObject({
      uncertain: true,
      unrecognized: false,
    });
  });

  it("« au goût » : quantité et unité vides", () => {
    const d = draft({
      ingredients: [
        {
          name: "Sel",
          itemId: "item-sel",
          quantity: null,
          unit: null,
          note: null,
          uncertain: false,
        },
      ],
    });
    expect(draftToForm(d, 4).state.ingredients[0]).toMatchObject({ quantityText: "", unit: "" });
  });

  it("import par lien : pré-remplit le lien de la page", () => {
    const { state } = draftToForm(draft({ sourceUrl: "https://exemple.fr/tarte" }), 4);
    expect(state.sourceUrl).toBe("https://exemple.fr/tarte");
    expect(draftToForm(draft(), 4).state.sourceUrl).toBe("");
  });

  it("garde au moins une ligne d'ingrédient et une étape", () => {
    const { state } = draftToForm(draft({ ingredients: [], steps: [] }), 4);
    expect(state.ingredients).toHaveLength(1);
    expect(state.steps).toEqual([""]);
  });

  it("donne des clés de ligne stables (identiques au rechargement)", () => {
    const a = draftToForm(draft(), 4).state.ingredients.map((l) => l.key);
    const b = draftToForm(draft(), 4).state.ingredients.map((l) => l.key);
    expect(a).toEqual(b);
  });
});

describe("importPagesForRecipe", () => {
  const pages = ["u1/r1/import-1.jpg", "u1/r1/import-2.jpg"];

  it("accepte les pages rangées dans le dossier de la recette", () => {
    expect(importPagesForRecipe(pages, "u1", "r1")).toEqual(pages);
  });

  it("refuse une page d'une autre recette ou d'un autre utilisateur", () => {
    expect(importPagesForRecipe([...pages, "u1/r2/import-1.jpg"], "u1", "r1")).toBeNull();
    expect(importPagesForRecipe(["u2/r1/import-1.jpg"], "u1", "r1")).toBeNull();
    expect(importPagesForRecipe(["u1/r1/../r2/x.jpg"], "u1", "r1")).toBeNull();
  });

  it("refuse une liste vide ou de plus de 3 pages", () => {
    expect(importPagesForRecipe([], "u1", "r1")).toBeNull();
    expect(importPagesForRecipe([...pages, ...pages], "u1", "r1")).toBeNull();
  });
});
