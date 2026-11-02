import { describe, expect, it } from "vitest";
import { groupByAisle } from "@/lib/aisles";

describe("groupByAisle", () => {
  const lines = [
    { name: "Lait", aisleName: "Crèmerie et œufs", aislePosition: 6 },
    { name: "Persil", aisleName: "Fruits et légumes", aislePosition: 1 },
    { name: "Œuf", aisleName: "Crèmerie et œufs", aislePosition: 6 },
    { name: "Piles", aislePosition: 99 },
  ];

  it("regroupe par rayon, dans l'ordre du magasin", () => {
    expect(groupByAisle(lines).map((g) => g.aisle)).toEqual([
      "Fruits et légumes",
      "Crèmerie et œufs",
      "Divers",
    ]);
  });

  it("garde l'ordre d'arrivée dans un rayon", () => {
    const cremerie = groupByAisle(lines).find((g) => g.aisle === "Crèmerie et œufs")!;
    expect(cremerie.lines.map((l) => l.name)).toEqual(["Lait", "Œuf"]);
  });

  it("met les articles sans rayon dans « Divers »", () => {
    expect(groupByAisle(lines).at(-1)).toEqual({ aisle: "Divers", lines: [lines[3]] });
  });

  it("renvoie une liste vide pour aucune ligne", () => {
    expect(groupByAisle([])).toEqual([]);
  });
});
