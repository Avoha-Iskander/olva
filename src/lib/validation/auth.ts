import { z } from "zod";

/**
 * Règles des formulaires de connexion, écrites une seule fois avec zod.
 * zod décrit la forme attendue des données et produit des messages d'erreur clairs.
 */

const email = z
  .string()
  .trim()
  .min(1, "L'email est obligatoire")
  .pipe(z.email("Adresse email invalide"));

const password = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(72, "Le mot de passe est trop long (72 caractères maximum)");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Le mot de passe est obligatoire"),
});

export const signUpSchema = z
  .object({ email, password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

/** Erreurs par champ, prêtes à afficher sous chaque champ du formulaire. */
export type FieldErrors = Partial<Record<string, string>>;

/** Transforme une erreur zod en { champ: premier message }. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    result[field] ??= issue.message;
  }
  return result;
}

/**
 * N'accepte que les redirections internes (« /recettes »), jamais vers un autre site
 * (« //site-pirate.com » ou « https://… ») : protège contre les liens piégés.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}
