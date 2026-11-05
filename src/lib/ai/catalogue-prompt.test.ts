import { describe, expect, it } from "vitest";

import { catalogueForPrompt } from "@/lib/ai/catalogue-prompt";

describe("catalogueForPrompt", () => {
  const items = [
    { name: "Oignon", defaultUnit: "piece", isPersonal: false },
    { name: "Beurre", defaultUnit: "g", isPersonal: false },
    { name: "Coriandre", defaultUnit: "botte", isPersonal: true },
  ];

  it("liste le catalogue commun par ordre alphabétique, avec l'unité habituelle", () => {
    const { common } = catalogueForPrompt(items, ["Fruits et légumes", "Crèmerie et œufs"]);
    expect(common).toContain("Fruits et légumes ; Crèmerie et œufs");
    expect(common).toContain("Beurre — g\nOignon — pièce");
    expect(common).not.toContain("Coriandre");
  });

  it("met mes articles personnels à part (le bloc commun reste identique pour tous)", () => {
    const { common, personal } = catalogueForPrompt(items, []);
    expect(personal).toContain("Coriandre — botte");
    expect(catalogueForPrompt(items.slice(0, 2), []).common).toBe(common);
    expect(catalogueForPrompt(items.slice(0, 2), []).personal).toBeNull();
  });
});
