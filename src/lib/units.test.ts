import { describe, expect, it } from "vitest";
import { convertQuantity, formatQuantity } from "@/lib/units";

describe("convertQuantity — conversions universelles", () => {
  it("convertit les poids", () => {
    expect(convertQuantity(1.5, "kg", "g")).toBe(1500);
    expect(convertQuantity(250, "g", "kg")).toBe(0.25);
  });

  it("convertit les volumes, cuillères comprises", () => {
    expect(convertQuantity(2, "cas", "ml")).toBe(30);
    expect(convertQuantity(3, "cac", "cas")).toBe(1);
    expect(convertQuantity(25, "cl", "l")).toBe(0.25);
  });

  it("garde la quantité si l'unité est la même", () => {
    expect(convertQuantity(3, "piece", "piece")).toBe(3);
  });

  it("refuse de mélanger poids et volume sans information", () => {
    expect(convertQuantity(100, "g", "ml")).toBeNull();
  });

  it("refuse de convertir des unités de comptage différentes", () => {
    expect(convertQuantity(1, "boite", "sachet")).toBeNull();
  });

  it("refuse une unité inconnue", () => {
    expect(convertQuantity(1, "tasse", "ml")).toBeNull();
  });
});

describe("convertQuantity — conversions propres à un article", () => {
  // L'exemple du SPEC : tomates cerises, 1 boîte = 250 g
  const tomateCerise = [{ fromUnit: "boite", toUnit: "g", factor: 250 }];

  it("convertit une boîte en grammes", () => {
    expect(convertQuantity(1, "boite", "g", tomateCerise)).toBe(250);
  });

  it("convertit dans l'autre sens (grammes → boîtes)", () => {
    expect(convertQuantity(500, "g", "boite", tomateCerise)).toBe(2);
  });

  it("combine avec une conversion universelle (boîte → kg)", () => {
    expect(convertQuantity(2, "boite", "kg", tomateCerise)).toBe(0.5);
  });

  it("combine dans l'autre sens (kg → boîte)", () => {
    expect(convertQuantity(0.5, "kg", "boite", tomateCerise)).toBe(2);
  });

  it("reste impossible sans conversion adaptée", () => {
    expect(convertQuantity(1, "boite", "ml", tomateCerise)).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("affiche l'unité et la virgule française", () => {
    expect(formatQuantity(1.5, "kg")).toBe("1,5 kg");
    expect(formatQuantity(2, "cas")).toBe("2 c. à soupe");
  });

  it("n'affiche pas « pièce »", () => {
    expect(formatQuantity(3, "piece")).toBe("3");
  });

  it("arrondit à 2 décimales", () => {
    expect(formatQuantity(1 / 3, "kg")).toBe("0,33 kg");
  });
});
