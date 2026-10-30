import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/validation/profile";

describe("profileSchema", () => {
  it("accepte un profil valide et nettoie le nom", () => {
    const result = profileSchema.safeParse({ displayName: "  Alex ", defaultServings: "4" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ displayName: "Alex", defaultServings: 4 });
  });

  it("refuse un nom vide", () => {
    const result = profileSchema.safeParse({ displayName: "   ", defaultServings: 4 });
    expect(result.success).toBe(false);
  });

  it("refuse 0 personne et plus de 20", () => {
    expect(profileSchema.safeParse({ displayName: "Alex", defaultServings: 0 }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ displayName: "Alex", defaultServings: 21 }).success).toBe(
      false,
    );
  });

  it("refuse un nombre à virgule", () => {
    expect(profileSchema.safeParse({ displayName: "Alex", defaultServings: 2.5 }).success).toBe(
      false,
    );
  });
});
