import { describe, expect, it } from "vitest";

import {
  type CarryoverItem,
  carryoverChoices,
  carryoverLines,
  finishMessage,
} from "@/lib/carryover";

const item = (patch: Partial<CarryoverItem> = {}): CarryoverItem => ({
  itemId: "lait",
  name: "Lait",
  aislePosition: 3,
  quantity: 1,
  unit: "l",
  ...patch,
});

describe("carryoverChoices", () => {
  it("propose chaque report, gardé par défaut", () => {
    expect(carryoverChoices([item()], [])).toEqual([{ ...item(), key: "lait:l", kept: true }]);
  });

  it("se souvient d'un report retiré pour cette liste", () => {
    const choices = carryoverChoices(
      [item(), item({ itemId: "oeuf", name: "Œuf", unit: "piece" })],
      [{ itemId: "lait", unit: "l", included: false }],
    );
    expect(choices.map((c) => c.kept)).toEqual([false, true]);
  });

  it("distingue un même article reporté dans deux unités", () => {
    const choices = carryoverChoices(
      [item(), item({ unit: "cl", quantity: 50 })],
      [{ itemId: "lait", unit: "cl", included: false }],
    );
    expect(choices.map((c) => [c.key, c.kept])).toEqual([
      ["lait:l", true],
      ["lait:cl", false],
    ]);
  });
});

describe("carryoverLines", () => {
  it("enregistre tous les reports, avec le choix gardé / retiré", () => {
    const lines = carryoverLines(
      carryoverChoices([item()], [{ itemId: "lait", unit: "l", included: false }]),
    );
    expect(lines).toEqual([
      {
        itemId: "lait",
        origin: "carryover",
        quantity: 1,
        unit: "l",
        included: false,
        lineKey: "carryover:lait:l",
      },
    ]);
  });
});

describe("finishMessage", () => {
  it("annonce le report, au singulier ou au pluriel", () => {
    expect(finishMessage(0, null)).toBe("Tous les articles sont dans le panier.");
    expect(finishMessage(1, null)).toBe(
      "1 article non coché sera reporté sur votre prochaine liste.",
    );
    expect(finishMessage(3, null)).toBe(
      "3 articles non cochés seront reportés sur votre prochaine liste.",
    );
  });

  it("sur une liste partagée, le report va au créateur", () => {
    expect(finishMessage(2, "Marie")).toBe(
      "2 articles non cochés seront reportés sur la prochaine liste de Marie.",
    );
  });
});
