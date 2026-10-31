import { z } from "zod";

import { isUnitCode } from "@/lib/units";

/**
 * Règles d'une recette (US-REC-01), utilisées par le formulaire (lot 2.4)
 * et, plus tard, par l'import photo (lot 5).
 */

const ingredientSchema = z
  .object({
    itemId: z.uuid("Choisissez un article du catalogue"),
    // Quantité facultative : vide = « au goût » (sel, poivre, persil…)
    quantity: z.number().positive("La quantité doit être positive").nullable(),
    unit: z.string().refine(isUnitCode, "Unité inconnue").nullable(),
    note: z.string().trim().max(120, "120 caractères maximum").optional(),
  })
  .refine((i) => (i.quantity === null) === (i.unit === null), {
    message: "Indiquez à la fois la quantité et l'unité, ou aucune des deux (« au goût »)",
    path: ["quantity"],
  });

export const recipeSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire").max(120, "120 caractères maximum"),
  servings: z
    .number({ error: "Nombre invalide" })
    .int("Nombre entier attendu")
    .min(1, "Au moins 1 personne")
    .max(50, "50 personnes maximum"),
  ingredients: z.array(ingredientSchema),
  // Les étapes vides sont retirées
  steps: z.array(z.string()).transform((steps) => steps.map((s) => s.trim()).filter(Boolean)),
  bookTitle: z.string().trim().max(120, "120 caractères maximum").optional(),
  bookPage: z.number().int().positive("Numéro de page invalide").nullable().optional(),
  collectionIds: z.array(z.uuid()).default([]),
});

export type RecipeInput = z.input<typeof recipeSchema>;
export type Recipe = z.output<typeof recipeSchema>;
