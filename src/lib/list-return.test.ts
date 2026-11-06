import { describe, expect, it } from "vitest";

import { afterSaveUrl, parseId, parseListReturn, withListReturn } from "@/lib/list-return";

const LIST = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const RECIPE = "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d";

describe("retour à la liste après création d'une recette", () => {
  it("n'accepte qu'un identifiant bien formé, ou « nouvelle »", () => {
    expect(parseListReturn(LIST)).toBe(LIST);
    expect(parseListReturn("nouvelle")).toBe("nouvelle");
    expect(parseListReturn("../admin")).toBeNull();
    expect(parseListReturn(undefined)).toBeNull();
    expect(parseListReturn([LIST])).toBeNull();
    expect(parseId(RECIPE)).toBe(RECIPE);
    expect(parseId("nouvelle")).toBeNull();
  });

  it("garde la liste d'origine dans l'adresse de l'écran de création", () => {
    expect(withListReturn("/recettes/lien", LIST)).toBe(`/recettes/lien?liste=${LIST}`);
    expect(withListReturn("/recettes/lien", null)).toBe("/recettes/lien");
  });

  it("revient à l'étape 1, recette cochée ; sinon ouvre la fiche", () => {
    expect(afterSaveUrl(RECIPE, LIST)).toBe(`/listes/${LIST}/recettes?ajout=${RECIPE}`);
    expect(afterSaveUrl(RECIPE, null, "?importee=1")).toBe(`/recettes/${RECIPE}?importee=1`);
  });
});
