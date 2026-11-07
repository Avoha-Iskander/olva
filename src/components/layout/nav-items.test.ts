import { describe, expect, it } from "vitest";
import { isNavActive } from "@/components/layout/nav-items";

describe("isNavActive", () => {
  it("une entrée reste active sur ses sous-pages", () => {
    expect(isNavActive("/recettes/123", "/recettes")).toBe(true);
    expect(isNavActive("/recettes", "/listes")).toBe(false);
    expect(isNavActive("/menus/abc", "/menus")).toBe(true);
  });

  it("préparer une liste (revue, pré-liste), c'est « Listes » (décision 068)", () => {
    expect(isNavActive("/listes/abc/revue", "/listes")).toBe(true);
    expect(isNavActive("/listes/abc/pre-liste", "/listes")).toBe(true);
    expect(isNavActive("/listes/abc/revue", "/menus")).toBe(false);
  });

  it("une adresse qui commence pareil n'active pas l'entrée", () => {
    expect(isNavActive("/menusx", "/menus")).toBe(false);
  });
});
