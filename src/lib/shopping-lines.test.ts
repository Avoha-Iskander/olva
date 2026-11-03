import { describe, expect, it } from "vitest";

import {
  applyChange,
  type LineRow,
  progress,
  setChecked,
  type ShoppingLine,
  shoppingGroups,
} from "@/lib/shopping-lines";

const line = (patch: Partial<ShoppingLine>): ShoppingLine => ({
  id: "l1",
  itemId: "i1",
  name: "Pomme",
  aisleName: "Fruits et légumes",
  aislePosition: 1,
  quantity: 4,
  unit: "piece",
  recipeTitles: [],
  checked: false,
  checkedBy: null,
  checkedAt: null,
  ...patch,
});

const row = (patch: Partial<LineRow>): LineRow => ({
  id: "l1",
  item_id: "i1",
  quantity: "4",
  unit: "piece",
  included: true,
  checked: false,
  checked_by: null,
  checked_at: null,
  ...patch,
});

describe("shoppingGroups", () => {
  it("groupe par rayon dans l'ordre du magasin, cochés en bas de leur rayon", () => {
    const groups = shoppingGroups([
      line({ id: "a", name: "Lait", aisleName: "Crèmerie", aislePosition: 3 }),
      line({ id: "b", name: "Poire", checked: true, checkedAt: "2026-11-03T10:00:00Z" }),
      line({ id: "c", name: "Banane" }),
      line({ id: "d", name: "Ail", checked: true, checkedAt: "2026-11-03T09:00:00Z" }),
    ]);
    expect(groups.map((g) => g.aisle)).toEqual(["Fruits et légumes", "Crèmerie"]);
    // À prendre (par nom), puis cochés (dans l'ordre où ils ont été cochés)
    expect(groups[0].lines.map((l) => l.id)).toEqual(["c", "d", "b"]);
    expect(groups[0].remaining).toBe(1);
  });
});

describe("progress", () => {
  it("compte les articles cochés", () => {
    expect(progress([line({ id: "a", checked: true }), line({ id: "b" })])).toEqual({
      checked: 1,
      total: 2,
    });
  });
});

describe("setChecked", () => {
  it("coche à l'écran avec la personne et l'heure, et décoche en effaçant les deux", () => {
    const checked = setChecked([line({})], "l1", true, "moi");
    expect(checked[0]).toMatchObject({ checked: true, checkedBy: "moi" });
    expect(checked[0].checkedAt).not.toBeNull();
    expect(setChecked(checked, "l1", false, "moi")[0]).toMatchObject({
      checked: false,
      checkedBy: null,
      checkedAt: null,
    });
  });

  it("ne change rien si la ligne est déjà dans cet état", () => {
    const lines = [line({ checked: true, checkedBy: "elle", checkedAt: "t" })];
    expect(setChecked(lines, "l1", true, "moi")[0].checkedBy).toBe("elle");
  });
});

describe("applyChange", () => {
  it("applique une coche venue d'un autre téléphone", () => {
    const result = applyChange([line({})], {
      eventType: "UPDATE",
      new: row({ checked: true, checked_by: "elle", checked_at: "t" }),
    });
    expect(result.needsReload).toBe(false);
    expect(result.lines[0]).toMatchObject({ checked: true, checkedBy: "elle" });
  });

  it("met à jour quantité et unité (texte numérique converti)", () => {
    const result = applyChange([line({})], {
      eventType: "UPDATE",
      new: row({ quantity: "1.5", unit: "kg" }),
    });
    expect(result.lines[0]).toMatchObject({ quantity: 1.5, unit: "kg" });
  });

  it("retire une ligne supprimée ou retirée de la liste", () => {
    expect(applyChange([line({})], { eventType: "DELETE", old: { id: "l1" } }).lines).toEqual([]);
    expect(
      applyChange([line({})], { eventType: "UPDATE", new: row({ included: false }) }).lines,
    ).toEqual([]);
  });

  it("demande un rechargement pour un article ajouté (nom et rayon inconnus)", () => {
    const result = applyChange([line({})], { eventType: "INSERT", new: row({ id: "l2" }) });
    expect(result).toMatchObject({ needsReload: true });
    expect(result.lines).toHaveLength(1);
  });

  it("ignore l'ajout d'une ligne non retenue", () => {
    expect(
      applyChange([], { eventType: "INSERT", new: row({ id: "l2", included: false }) }).needsReload,
    ).toBe(false);
  });
});
