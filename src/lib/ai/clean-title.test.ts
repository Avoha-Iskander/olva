import { describe, expect, it } from "vitest";

import { cleanTitle } from "@/lib/ai/clean-title";

describe("cleanTitle", () => {
  it.each([
    ["Osso bucco de veau : la meilleure recette", "Osso bucco de veau"],
    ["Bœuf bourguignon : la meilleure recette traditionnelle", "Bœuf bourguignon"],
    ["Crêpes faciles - recette rapide", "Crêpes faciles"],
    ["Gâteau au yaourt | Recette facile | Marmiton", "Gâteau au yaourt"],
  ])("« %s » → « %s »", (input, expected) => {
    expect(cleanTitle(input)).toBe(expected);
  });

  it.each([
    "Tarte Tatin",
    "Poulet basquaise",
    "Pâtes à la carbonara",
    "Chili con carne - version végétarienne",
  ])("laisse « %s » intact", (title) => {
    expect(cleanTitle(title)).toBe(title);
  });
});
