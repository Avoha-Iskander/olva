import { describe, expect, it } from "vitest";
import { isNavActive } from "@/components/layout/nav-items";

describe("isNavActive", () => {
  it("garde l'entrée active sur les sous-pages", () => {
    expect(isNavActive("/recettes/123", "/recettes")).toBe(true);
    expect(isNavActive("/recettes", "/listes")).toBe(false);
  });

  it("préparer une liste reste « Créer », même à son adresse /listes/…", () => {
    expect(isNavActive("/listes/abc/recettes", "/nouvelle-liste")).toBe(true);
    expect(isNavActive("/listes/abc/revue", "/listes")).toBe(false);
    expect(isNavActive("/listes/abc/pre-liste", "/nouvelle-liste")).toBe(true);
  });

  it("une liste prête est dans « Listes »", () => {
    expect(isNavActive("/listes/abc", "/listes")).toBe(true);
    expect(isNavActive("/listes/abc", "/nouvelle-liste")).toBe(false);
  });
});
