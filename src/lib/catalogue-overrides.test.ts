import { describe, expect, it } from "vitest";

import { applyOverride, preferMine } from "@/lib/catalogue-overrides";

const aisles = new Map([
  [1, { name: "Fruits et légumes", position: 1 }],
  [11, { name: "Épices", position: 11 }],
  [21, { name: "Divers", position: 21 }],
]);
const sel = {
  id: "sel",
  aisleId: 11,
  aisleName: "Épices",
  aislePosition: 11,
  isStaple: true,
  purchaseUnit: "paquet",
};

describe("applyOverride", () => {
  it("sans personnalisation, l'article est inchangé", () => {
    expect(applyOverride(sel, undefined, aisles)).toEqual(sel);
  });

  it("change le rayon (nom et position compris)", () => {
    const result = applyOverride(
      sel,
      { itemId: "sel", aisleId: 21, isStaple: null, purchaseUnit: null },
      aisles,
    );
    expect(result).toMatchObject({ aisleId: 21, aisleName: "Divers", aislePosition: 21 });
    expect(result.isStaple).toBe(true); // non personnalisé : valeur du catalogue
  });

  it("n'est plus un ingrédient de base", () => {
    const result = applyOverride(
      sel,
      { itemId: "sel", aisleId: null, isStaple: false, purchaseUnit: null },
      aisles,
    );
    expect(result).toMatchObject({ isStaple: false, aisleId: 11 });
  });

  it("devient un ingrédient de base, avec son unité de conditionnement", () => {
    const persil = { ...sel, id: "persil", aisleId: 1, isStaple: false, purchaseUnit: null };
    const result = applyOverride(
      persil,
      { itemId: "persil", aisleId: null, isStaple: true, purchaseUnit: "botte" },
      aisles,
    );
    expect(result).toMatchObject({ isStaple: true, purchaseUnit: "botte" });
  });
});

describe("preferMine", () => {
  it("met mes conversions en premier", () => {
    const list = [
      { ownerId: null, factor: 250 },
      { ownerId: "moi", factor: 400 },
    ];
    expect(preferMine(list, "moi").map((c) => c.factor)).toEqual([400, 250]);
  });
});
