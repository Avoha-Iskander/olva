import { describe, expect, it } from "vitest";

import { finishMessage } from "@/lib/carryover";

describe("finishMessage", () => {
  it("tout est pris", () => {
    expect(finishMessage(0, null)).toBe("Tous les articles sont dans le panier.");
  });

  it("articles restants, au singulier et au pluriel", () => {
    expect(finishMessage(1, null)).toBe("1 article pas encore coché.");
    expect(finishMessage(3, null)).toBe("3 articles pas encore cochés.");
  });

  it("liste qu'on me partage : la nouvelle liste sera à son créateur", () => {
    expect(finishMessage(2, "Marie")).toBe(
      "2 articles pas encore cochés. La nouvelle liste éventuelle sera à Marie.",
    );
  });
});
