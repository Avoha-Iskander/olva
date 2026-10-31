import { describe, expect, it } from "vitest";
import { parseQuantity, quantityToInput } from "@/lib/quantity";

describe("parseQuantity", () => {
  it("lit les entiers et les décimales à la française", () => {
    expect(parseQuantity("2")).toBe(2);
    expect(parseQuantity("1,5")).toBe(1.5);
    expect(parseQuantity("0.25")).toBe(0.25);
  });
  it("lit les fractions", () => {
    expect(parseQuantity("1/2")).toBe(0.5);
    expect(parseQuantity("1 1/2")).toBe(1.5);
  });
  it("renvoie null pour une saisie vide (au goût)", () => {
    expect(parseQuantity("  ")).toBeNull();
  });
  it("refuse les saisies invalides", () => {
    expect(parseQuantity("abc")).toBeUndefined();
    expect(parseQuantity("0")).toBeUndefined();
    expect(parseQuantity("1/0")).toBeUndefined();
    expect(parseQuantity("-2")).toBeUndefined();
  });
});

describe("quantityToInput", () => {
  it("affiche avec une virgule", () => {
    expect(quantityToInput(1.5)).toBe("1,5");
    expect(quantityToInput(null)).toBe("");
  });
});
