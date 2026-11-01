import { describe, expect, it } from "vitest";
import { createShareToken, hashShareToken } from "@/lib/share-token";

describe("hashShareToken", () => {
  it("calcule l'empreinte SHA-256 attendue (valeur de référence)", () => {
    expect(hashShareToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("createShareToken", () => {
  it("produit un jeton utilisable dans une adresse web", () => {
    const { token } = createShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("renvoie l'empreinte du jeton", () => {
    const { token, hash } = createShareToken();
    expect(hash).toBe(hashShareToken(token));
  });

  it("ne produit jamais deux fois le même jeton", () => {
    expect(createShareToken().token).not.toBe(createShareToken().token);
  });
});
