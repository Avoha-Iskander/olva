import { describe, expect, it } from "vitest";

import { applyOverride, conversionsByItem, preferMine } from "@/lib/catalogue-overrides";
import { convertQuantity } from "@/lib/units";

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

describe("conversionsByItem", () => {
  const rows = [
    { item_id: "tomates", owner_id: null, from_unit: "boite", to_unit: "g", factor: "400" },
    { item_id: "tomates", owner_id: "moi", from_unit: "boite", to_unit: "g", factor: 250 },
    { item_id: "carotte", owner_id: null, from_unit: "piece", to_unit: "g", factor: 100 },
  ];

  it("range par article, ma conversion d'abord, facteur en nombre", () => {
    const byItem = conversionsByItem(rows, "moi");
    expect(byItem.get("tomates")).toEqual([
      { fromUnit: "boite", toUnit: "g", factor: 250 },
      { fromUnit: "boite", toUnit: "g", factor: 400 },
    ]);
    expect(byItem.get("carotte")).toEqual([{ fromUnit: "piece", toUnit: "g", factor: 100 }]);
  });

  it("ma conversion est celle qu'on applique (non-régression : fin des courses, ajout)", () => {
    const mine = conversionsByItem(rows, "moi").get("tomates");
    expect(convertQuantity(2, "boite", "g", mine)).toBe(500);
  });
});
