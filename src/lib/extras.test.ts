import { describe, expect, it } from "vitest";

import { groupExtrasByAisle, isInPrelist } from "@/lib/extras";
import type { ExtraItem } from "@/lib/lists";

const item = (itemId: string, aisleName: string, aislePosition: number): ExtraItem => ({
  itemId,
  name: itemId,
  aisleName,
  aislePosition,
  quantity: 1,
  unit: "piece",
});

const banane = item("Banane", "Fruits et légumes", 1);
const lait = item("Lait", "Crèmerie", 6);
const abricot = item("Abricot", "Fruits et légumes", 1);
const litiere = item("Litière", "Animalerie", 19);

describe("groupExtrasByAisle", () => {
  it("range un ajout dans son rayon, après les articles de la pré-liste", () => {
    const groups = groupExtrasByAisle([banane, lait], [abricot]);
    expect(groups.map((g) => g.aisle)).toEqual(["Fruits et légumes", "Crèmerie"]);
    expect(groups[0].rows).toEqual([
      { kind: "prelist", entry: banane },
      { kind: "free", entry: abricot },
    ]);
  });

  it("crée le rayon d'un ajout s'il n'existe pas dans la pré-liste, à sa place", () => {
    const groups = groupExtrasByAisle([banane, lait], [litiere]);
    expect(groups.map((g) => g.aisle)).toEqual(["Fruits et légumes", "Crèmerie", "Animalerie"]);
  });

  it("n'affiche pas deux fois un ajout déjà présent dans la pré-liste", () => {
    const groups = groupExtrasByAisle([banane], [banane]);
    expect(groups[0].rows).toEqual([{ kind: "prelist", entry: banane }]);
  });
});

describe("isInPrelist", () => {
  it("reconnaît un article de la pré-liste", () => {
    expect(isInPrelist([banane], "Banane")).toBe(true);
    expect(isInPrelist([banane], "Abricot")).toBe(false);
  });
});
