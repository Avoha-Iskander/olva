import { describe, expect, it } from "vitest";
import { safeRedirectPath, signInSchema, signUpSchema, toFieldErrors } from "@/lib/validation/auth";

describe("signUpSchema", () => {
  it("accepte une inscription valide", () => {
    const result = signUpSchema.safeParse({
      email: "  alex@example.com ",
      password: "motdepasse",
      confirmPassword: "motdepasse",
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("alex@example.com");
  });

  it("refuse un email invalide", () => {
    const result = signUpSchema.safeParse({
      email: "alex",
      password: "motdepasse",
      confirmPassword: "motdepasse",
    });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!).email).toBe("Adresse email invalide");
  });

  it("refuse un mot de passe trop court", () => {
    const result = signUpSchema.safeParse({
      email: "alex@example.com",
      password: "court",
      confirmPassword: "court",
    });
    expect(toFieldErrors(result.error!).password).toMatch(/8 caractères/);
  });

  it("refuse deux mots de passe différents", () => {
    const result = signUpSchema.safeParse({
      email: "alex@example.com",
      password: "motdepasse",
      confirmPassword: "autrechose",
    });
    expect(toFieldErrors(result.error!).confirmPassword).toMatch(/ne correspondent pas/);
  });
});

describe("signInSchema", () => {
  it("exige un mot de passe", () => {
    const result = signInSchema.safeParse({ email: "alex@example.com", password: "" });
    expect(toFieldErrors(result.error!).password).toBe("Le mot de passe est obligatoire");
  });
});

describe("safeRedirectPath", () => {
  it("garde un chemin interne", () => {
    expect(safeRedirectPath("/recettes")).toBe("/recettes");
  });

  it("refuse les redirections vers un autre site", () => {
    expect(safeRedirectPath("https://pirate.com")).toBe("/");
    expect(safeRedirectPath("//pirate.com")).toBe("/");
    expect(safeRedirectPath("/\\pirate.com")).toBe("/");
  });

  it("utilise la valeur par défaut si rien n'est fourni", () => {
    expect(safeRedirectPath(null, "/accueil")).toBe("/accueil");
  });
});
