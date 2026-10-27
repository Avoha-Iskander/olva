import { describe, expect, it } from "vitest";
import { scaleQuantity } from "@/lib/servings";

describe("scaleQuantity", () => {
  it("augmente la quantité quand on passe de 4 à 6 personnes", () => {
    expect(scaleQuantity(200, 4, 6)).toBe(300);
  });

  it("diminue la quantité quand on passe de 4 à 2 personnes", () => {
    expect(scaleQuantity(3, 4, 2)).toBe(1.5);
  });

  it("arrondit à 2 décimales", () => {
    expect(scaleQuantity(1, 3, 1)).toBe(0.33);
  });

  it("refuse une recette pour 0 personne", () => {
    expect(() => scaleQuantity(100, 0, 4)).toThrow();
  });
});
