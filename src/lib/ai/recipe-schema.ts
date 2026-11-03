/**
 * Format de la recette extraite d'une photo par l'IA (SPEC §9.2).
 *
 * Le même format sert deux fois :
 * - envoyé à Claude (JSON Schema de « l'outil » extract_recipe) : il lui dit quoi remplir ;
 * - vérifié à la réception (zod) : on ne fait jamais confiance aveuglément à une réponse.
 */
import { z } from "zod";

import { UNITS } from "@/lib/units";

/** Codes d'unité acceptés (les mêmes que la table units). */
export const UNIT_CODES = Object.keys(UNITS) as [string, ...string[]];

export const extractedRecipeSchema = z.object({
  is_recipe: z.boolean(),
  reason: z.string().max(300).nullish(), // pourquoi ce n'est pas une recette
  title: z.string().trim().max(120).nullish(),
  title_uncertain: z.boolean().default(false),
  servings: z.number().int().min(1).max(50).nullish(),
  servings_uncertain: z.boolean().default(false),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        quantity: z.number().positive().max(100000).nullable(), // null : « au goût »
        unit: z.enum(UNIT_CODES).nullable(),
        note: z.string().trim().max(120).nullish(),
        uncertain: z.boolean().default(false),
      }),
    )
    .max(60)
    .default([]),
  steps: z.array(z.string().trim().min(1).max(2000)).max(40).default([]),
  book_page: z.number().int().positive().max(5000).nullish(),
});
export type ExtractedRecipe = z.infer<typeof extractedRecipeSchema>;

/** Le même format, en JSON Schema, pour l'outil que Claude doit « appeler ». */
export const extractRecipeTool = {
  name: "extract_recipe",
  description: "Enregistre la recette lue sur la photo (ou indique que ce n'est pas une recette).",
  input_schema: {
    type: "object" as const,
    properties: {
      is_recipe: { type: "boolean", description: "La photo montre-t-elle une recette ?" },
      reason: {
        type: "string",
        description: "Si ce n'est pas une recette : ce que montre la photo.",
      },
      title: { type: "string" },
      title_uncertain: { type: "boolean" },
      servings: {
        type: "integer",
        description: "Nombre de personnes ; omis s'il n'est pas indiqué.",
      },
      servings_uncertain: { type: "boolean" },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Nom de l'ingrédient, au singulier, sans quantité.",
            },
            quantity: {
              type: ["number", "null"],
              description:
                "Quantité pour le nombre de personnes de la recette ; null si « au goût ».",
            },
            unit: {
              type: ["string", "null"],
              enum: [...UNIT_CODES, null],
              description: "Code d'unité ; null si la quantité est null.",
            },
            note: { type: "string", description: "Précision : « émincé », « bien mûres »…" },
            uncertain: { type: "boolean", description: "Vrai si la lecture est douteuse." },
          },
          required: ["name", "quantity", "unit"],
        },
      },
      steps: { type: "array", items: { type: "string" } },
      book_page: { type: "integer", description: "Numéro de page imprimé, s'il est visible." },
    },
    required: ["is_recipe"],
  },
};

/**
 * Vérifie la réponse de l'IA et la nettoie : une quantité sans unité devient
 * « pièce », une unité sans quantité est ignorée (règle « quantité et unité vont ensemble »).
 */
export function parseExtraction(
  input: unknown,
): { ok: true; recipe: ExtractedRecipe } | { ok: false; error: string } {
  const parsed = extractedRecipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalide" };
  const recipe = parsed.data;
  return {
    ok: true,
    recipe: {
      ...recipe,
      ingredients: recipe.ingredients.map((i) =>
        i.quantity === null ? { ...i, unit: null } : { ...i, unit: i.unit ?? "piece" },
      ),
    },
  };
}
