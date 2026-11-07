import { describe, expect, it } from "vitest";

import { afterSaveUrl, parseId, withMenuReturn } from "@/lib/menu-return";

const MENU = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const RECIPE = "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d";

describe("retour au menu après création d'une recette", () => {
  it("n'accepte qu'un identifiant bien formé", () => {
    expect(parseId(MENU)).toBe(MENU);
    expect(parseId("nouvelle")).toBeNull();
    expect(parseId("../admin")).toBeNull();
    expect(parseId(undefined)).toBeNull();
    expect(parseId([MENU])).toBeNull();
  });

  it("garde le menu d'origine dans l'adresse de l'écran de création", () => {
    expect(withMenuReturn("/recettes/lien", MENU)).toBe(`/recettes/lien?menu=${MENU}`);
    expect(withMenuReturn("/recettes/lien", null)).toBe("/recettes/lien");
  });

  it("revient au menu, recette ajoutée ; sinon ouvre la fiche", () => {
    expect(afterSaveUrl(RECIPE, MENU)).toBe(`/menus/${MENU}?ajout=${RECIPE}`);
    expect(afterSaveUrl(RECIPE, null, "?importee=1")).toBe(`/recettes/${RECIPE}?importee=1`);
  });
});
