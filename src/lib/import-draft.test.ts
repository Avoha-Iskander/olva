import { describe, expect, it } from "vitest";

import { countHighlights, draftToForm, type ImportDraft } from "@/lib/import-draft";

const draft = (patch: Partial<ImportDraft> = {}): ImportDraft => ({
  importId: "imp-1",
  photoPaths: ["u/r/import-1.webp"],
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
