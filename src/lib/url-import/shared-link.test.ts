import { describe, expect, it } from "vitest";

import {
  cleanSharedUrl,
  findUrl,
  isInstagram,
  readSharedInput,
} from "@/lib/url-import/shared-link";

describe("cleanSharedUrl", () => {
  it("retire les paramètres de suivi et l'ancre, garde les autres", () => {
    expect(cleanSharedUrl("https://www.instagram.com/p/AbC123/?igsh=xyz&utm_source=ig")).toBe(
      "https://www.instagram.com/p/AbC123/",
    );
    expect(cleanSharedUrl("https://site.fr/recette?id=42&fbclid=1#etapes")).toBe(
      "https://site.fr/recette?id=42",
    );
  });

  it("refuse ce qui n'est pas une adresse web", () => {
    expect(cleanSharedUrl("javascript:alert(1)")).toBeNull();
    expect(cleanSharedUrl("pas une adresse")).toBeNull();
  });
});

describe("findUrl", () => {
  it("trouve le lien au milieu d'un texte, sans la ponctuation qui suit", () => {
    expect(findUrl("Regarde cette recette : https://site.fr/tarte. Trop bon !")).toBe(
      "https://site.fr/tarte",
    );
    expect(findUrl("(https://site.fr/crepes)")).toBe("https://site.fr/crepes");
  });

  it("ne trouve rien sans lien", () => {
    expect(findUrl("Une simple note")).toBeNull();
  });
});

describe("readSharedInput", () => {
  it("prend le lien envoyé seul", () => {
    expect(readSharedInput({ url: "https://site.fr/tarte" })).toEqual({
      url: "https://site.fr/tarte",
    });
  });

  it("trouve le lien dans le texte (Instagram, Raccourci iPhone)", () => {
    expect(
      readSharedInput({ text: "Recette de @chef https://www.instagram.com/reel/XyZ/?igsh=abc" }),
    ).toEqual({ url: "https://www.instagram.com/reel/XyZ/" });
  });

  it("sans lien, garde un texte assez long pour être une recette", () => {
    const text = "Pâte à crêpes : 250 g de farine, 4 œufs, 50 cl de lait. Mélanger.";
    expect(readSharedInput({ text })).toEqual({ text });
    expect(readSharedInput({ text: "Coucou" })).toBeNull();
    expect(readSharedInput({})).toBeNull();
  });
});

describe("isInstagram", () => {
  it("reconnaît Instagram, et seulement lui", () => {
    expect(isInstagram("https://www.instagram.com/p/AbC/")).toBe(true);
    expect(isInstagram("https://instagram.com/reel/AbC/")).toBe(true);
    expect(isInstagram("https://pasinstagram.com.fr/p/AbC/")).toBe(false);
    expect(isInstagram("pas une adresse")).toBe(false);
  });
});
