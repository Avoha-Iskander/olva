import { describe, expect, it } from "vitest";

import { isImageLink } from "@/lib/url-import/image-link";

describe("isImageLink", () => {
  it("reconnaît une image au type annoncé par le site", () => {
    expect(isImageLink("https://exemple.fr/media/12345", "image/jpeg")).toBe(true);
  });

  it("reconnaît une image à la fin de son adresse, paramètres compris", () => {
    expect(isImageLink("https://img-3.journaldesfemmes.fr/abc/tarte-aux-pommes.jpg", "")).toBe(
      true,
    );
    expect(isImageLink("https://exemple.fr/photo.WEBP?w=800", undefined)).toBe(true);
  });

  it("ne confond pas une page avec une image", () => {
    expect(
      isImageLink("https://cuisine.journaldesfemmes.fr/recette/315-tarte", "application/pdf"),
    ).toBe(false);
    expect(isImageLink("https://exemple.fr/jpg-et-recettes", "")).toBe(false);
  });
});
