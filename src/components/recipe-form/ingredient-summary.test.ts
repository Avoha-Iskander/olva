import { describe, expect, it } from "vitest";

import { ingredientSummary } from "@/components/recipe-form/ingredient-row";
import type { FormIngredient } from "@/lib/recipe-form";

const line = (over: Partial<FormIngredient>): FormIngredient =>
  ({
    key: "k",
    itemId: "i",
    itemName: "Farine",
    quantityText: "250",
    unit: "g",
    note: "",
    ...over,
  }) as FormIngredient;

describe("ingredientSummary (ligne repliée, décision 079)", () => {
  it("quantité et unité, article, remarque", () => {
    expect(ingredientSummary(line({ note: " tamisée " }))).toEqual({
      amount: "250 g",
      name: "Farine",
      note: "tamisée",
    });
  });

  it("pièces : le nombre seul ; sans quantité : « au goût »", () => {
    expect(ingredientSummary(line({ quantityText: "3", unit: "piece" })).amount).toBe("3");
    expect(ingredientSummary(line({ quantityText: "", unit: "" })).amount).toBe("au goût");
  });

  it("article pas encore choisi", () => {
    expect(ingredientSummary(line({ itemId: null, itemName: "" })).name).toBe("Article à choisir");
  });
});
