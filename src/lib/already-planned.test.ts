import { describe, expect, it } from "vitest";

import { alreadyPlanned } from "@/lib/already-planned";

const titles = { crepes: "Crêpes", gateau: "Gâteau" };

describe("alreadyPlanned (« Déjà prévu »)", () => {
  it("quantité et recette d'où vient l'article", () => {
    const planned = alreadyPlanned(
      [{ itemId: "farine", quantity: 250, unit: "g", recipeIds: ["crepes"] }],
      titles,
    );
    expect(planned.get("farine")).toBe("250 g (Crêpes)");
  });

  it("plusieurs unités et plusieurs recettes : jointes, sans doublon", () => {
    const planned = alreadyPlanned(
      [
        { itemId: "sucre", quantity: 100, unit: "g", recipeIds: ["crepes", "gateau"] },
        { itemId: "sucre", quantity: 1, unit: "paquet", recipeIds: ["gateau"] },
      ],
      titles,
    );
    expect(planned.get("sucre")).toBe("100 g + 1 paquet (Crêpes, Gâteau)");
  });

  it("recette inconnue (plus partagée) : la quantité seule", () => {
    const planned = alreadyPlanned(
      [{ itemId: "oeuf", quantity: 3, unit: "piece", recipeIds: ["disparue"] }],
      titles,
    );
    expect(planned.get("oeuf")).toBe("3");
  });

  it("article absent des recettes : pas de libellé", () => {
    expect(alreadyPlanned([], titles).has("miel")).toBe(false);
  });
});
