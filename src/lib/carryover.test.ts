import { describe, expect, it } from "vitest";

import { uncheckedSummary } from "@/lib/carryover";

describe("uncheckedSummary", () => {
  it("jusqu'à 3 articles : tous", () => {
    expect(uncheckedSummary(["Beurre"])).toBe("Beurre");
    expect(uncheckedSummary(["Beurre", "Lait", "Sucre"])).toBe("Beurre, Lait, Sucre");
  });

  it("au-delà : les 3 premiers et le nombre restant", () => {
    expect(uncheckedSummary(["Beurre", "Lait", "Sucre", "Œufs"])).toBe(
      "Beurre, Lait, Sucre et 1 autre",
    );
    expect(uncheckedSummary(["A", "B", "C", "D", "E"])).toBe("A, B, C et 2 autres");
  });
});
