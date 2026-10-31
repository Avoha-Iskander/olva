import { describe, expect, it } from "vitest";
import { normalizeText } from "@/lib/text";

describe("normalizeText", () => {
  it("retire majuscules et accents", () => {
    expect(normalizeText("Crème Fraîche")).toBe("creme fraiche");
  });
  it("gère les ligatures œ et æ", () => {
    expect(normalizeText("Œuf")).toBe("oeuf");
    expect(normalizeText("Bœuf haché")).toBe("boeuf hache");
  });
  it("réduit les espaces", () => {
    expect(normalizeText("  pomme   de  terre ")).toBe("pomme de terre");
  });
});
