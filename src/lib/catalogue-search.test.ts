import { describe, expect, it } from "vitest";
import { searchItems } from "@/lib/catalogue-search";

const items = ["Tomate", "Tomate cerise", "Concentré de tomate", "Crème liquide", "Œuf"].map(
  (name) => ({
    name,
  }),
);

describe("searchItems", () => {
  it("place d'abord les noms qui commencent par la recherche", () => {
    expect(searchItems(items, "tomate").map((i) => i.name)).toEqual([
      "Tomate",
      "Tomate cerise",
      "Concentré de tomate",
    ]);
  });
  it("ignore les accents et les majuscules", () => {
    expect(searchItems(items, "CREME").map((i) => i.name)).toEqual(["Crème liquide"]);
    expect(searchItems(items, "oeuf").map((i) => i.name)).toEqual(["Œuf"]);
  });
  it("renvoie le début du catalogue si la recherche est vide", () => {
    expect(searchItems(items, " ")).toHaveLength(5);
  });
});
