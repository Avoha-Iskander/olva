import { z } from "zod";

/** Règles du profil (nom affiché, nombre de personnes par défaut). */

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 20;

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Indiquez votre prénom ou un surnom")
    .max(60, "60 caractères maximum"),
  defaultServings: z.coerce
    .number({ error: "Nombre invalide" })
    .int("Nombre entier attendu")
    .min(MIN_SERVINGS, `Au moins ${MIN_SERVINGS} personne`)
    .max(MAX_SERVINGS, `${MAX_SERVINGS} personnes maximum`),
});

export type ProfileInput = z.infer<typeof profileSchema>;
