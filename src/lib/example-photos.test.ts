import { describe, expect, it } from "vitest";

import { examplePhotoUrl, isExamplePhoto } from "@/lib/example-photos";

describe("photos des recettes d'exemple", () => {
  it("reconnaît une photo d'exemple, et pas une photo d'utilisateur", () => {
    expect(isExamplePhoto("exemples/crepes.webp")).toBe(true);
    expect(isExamplePhoto("3f1b8c2e/recette/photo-1.jpg")).toBe(false);
    expect(isExamplePhoto(null)).toBe(false);
  });

  it("refuse un chemin qui sortirait du dossier des exemples", () => {
    expect(isExamplePhoto("exemples/../secret.jpg")).toBe(false);
  });

  it("donne l'adresse servie par l'app", () => {
    expect(examplePhotoUrl("exemples/crepes.webp")).toBe("/exemples/crepes.webp");
  });
});
