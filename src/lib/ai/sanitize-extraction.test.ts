import { describe, expect, it } from "vitest";

import { parseExtraction } from "@/lib/ai/recipe-schema";
import { sanitizeExtraction, toUnitCode } from "@/lib/ai/sanitize-extraction";

const base = {
  is_recipe: true,
  title: "Tarte aux pommes",
  servings: 6,
  ingredients: [{ name: "pomme", quantity: 4, unit: "piece" }],
  steps: ["Éplucher les pommes."],
};

describe("toUnitCode", () => {
  it("reconnaît les codes et les formes écrites en toutes lettres", () => {
    expect(toUnitCode("cas")).toBe("cas");
    expect(toUnitCode("c. à soupe")).toBe("cas");
    expect(toUnitCode("Cuillères à café")).toBe("cac");
    expect(toUnitCode("grammes")).toBe("g");
    expect(toUnitCode("pièces")).toBe("piece");
    expect(toUnitCode("tasse")).toBeNull();
  });
});

describe("sanitizeExtraction + parseExtraction (cas réels de la dev, 13/11)", () => {
  it("ne change rien à une réponse déjà correcte", () => {
    expect(sanitizeExtraction(base)).toEqual(base);
  });

  it("accepte une « raison » trop longue en la coupant (au lieu de tout rejeter)", () => {
    const parsed = parseExtraction({ ...base, reason: "x".repeat(450) });
    expect(parsed.ok).toBe(true);
  });

  it("accepte une unité hors liste : retirée, gardée dans la note, ingrédient à vérifier", () => {
    const parsed = parseExtraction({
      ...base,
      ingredients: [{ name: "farine", quantity: 2, unit: "tasse", note: "tamisée" }],
    });
    expect(parsed).toMatchObject({
      ok: true,
      recipe: {
        ingredients: [
          { name: "farine", quantity: 2, unit: "piece", note: "tasse, tamisée", uncertain: true },
        ],
      },
    });
  });

  it("traduit une unité écrite en toutes lettres", () => {
    const parsed = parseExtraction({
      ...base,
      ingredients: [{ name: "huile", quantity: 2, unit: "c. à soupe" }],
    });
    expect(parsed).toMatchObject({ ok: true, recipe: { ingredients: [{ unit: "cas" }] } });
  });

  it("répare un article à créer dont l'unité est inconnue", () => {
    const parsed = parseExtraction({
      ...base,
      ingredients: [
        {
          name: "sirop d'érable",
          quantity: 5,
          unit: "cl",
          item: null,
          new_item: { aisle: "Épicerie sucrée", unit: "flacon", purchase_unit: "flacon" },
        },
      ],
    });
    expect(parsed).toMatchObject({
      ok: true,
      recipe: { ingredients: [{ new_item: { unit: "piece", purchase_unit: null } }] },
    });
  });

  it("retire les ingrédients sans nom, les étapes vides et les nombres impossibles", () => {
    const parsed = parseExtraction({
      ...base,
      servings: 0,
      ingredients: [
        { name: "  ", quantity: 1, unit: "g" },
        { name: "sel", quantity: -1, unit: "g" },
      ],
      steps: ["", "Cuire 30 min."],
    });
    expect(parsed).toMatchObject({
      ok: true,
      recipe: {
        servings: null,
        servings_uncertain: true,
        ingredients: [{ name: "sel", quantity: null, unit: null }],
        steps: ["Cuire 30 min."],
      },
    });
  });
});
