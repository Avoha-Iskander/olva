import { describe, expect, it } from "vitest";

import { convertToItemUnit } from "@/lib/ai/convert-to-item-unit";

const carrot = [{ fromUnit: "piece", toUnit: "g", factor: 100 }];
const shank = [{ fromUnit: "tranche", toUnit: "g", factor: 250 }];

describe("convertToItemUnit", () => {
  it("met des grammes en pièces, et garde la quantité de la recette en note", () => {
    expect(convertToItemUnit({ quantity: 200, unit: "g", note: null }, "piece", carrot)).toEqual({
      quantity: 2,
      unit: "piece",
      note: "200 g dans la recette",
    });
  });

  it("met des tranches en grammes (pluriel dans la note)", () => {
    expect(convertToItemUnit({ quantity: 4, unit: "tranche", note: null }, "g", shank)).toEqual({
      quantity: 1000,
      unit: "g",
      note: "4 tranches dans la recette",
    });
  });

  it("arrondit à la demi-pièce", () => {
    expect(
      convertToItemUnit({ quantity: 150, unit: "g", note: null }, "piece", carrot).quantity,
    ).toBe(1.5);
    expect(
      convertToItemUnit({ quantity: 330, unit: "g", note: null }, "piece", carrot).quantity,
    ).toBe(3.5);
  });

  it("ne convertit pas une quantité trop petite (moins d'une demi-pièce)", () => {
    const line = { quantity: 20, unit: "g", note: null };
    expect(convertToItemUnit(line, "piece", carrot)).toBe(line);
  });

  it("complète une note existante, sans doublon", () => {
    expect(
      convertToItemUnit({ quantity: 200, unit: "g", note: "en rondelles" }, "piece", carrot).note,
    ).toBe("200 g dans la recette ; en rondelles");
    expect(
      convertToItemUnit({ quantity: 200, unit: "g", note: "soit 200 g" }, "piece", carrot).note,
    ).toBe("soit 200 g");
  });

  it("garde l'écriture de la recette dans une même famille (g et kg)", () => {
    const line = { quantity: 500, unit: "g", note: null };
    expect(convertToItemUnit(line, "kg", [])).toBe(line);
  });

  it("laisse la ligne telle quelle sans conversion connue", () => {
    const line = { quantity: 200, unit: "g", note: null };
    expect(convertToItemUnit(line, "piece", [])).toBe(line);
  });

  it("laisse les lignes sans quantité, sans unité, ou déjà dans la bonne unité", () => {
    for (const line of [
      { quantity: null, unit: "g", note: null },
      { quantity: 2, unit: null, note: null },
      { quantity: 2, unit: "piece", note: null },
      { quantity: 1, unit: "pincee", note: null },
    ]) {
      expect(convertToItemUnit(line, "piece", carrot)).toBe(line);
    }
  });
});
