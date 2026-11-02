"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const recipesSchema = z
  .array(z.object({ recipeId: z.uuid(), servings: z.number().int().min(1).max(50) }))
  .max(50);

/**
 * Étape 1 : enregistre les recettes choisies et leurs portions.
 * Le brouillon de liste est créé au premier enregistrement ; on renvoie son identifiant.
 */
export async function saveListRecipes(
  listId: string | null,
  recipes: { recipeId: string; servings: number }[],
): Promise<{ ok: true; listId: string } | { ok: false }> {
  const parsed = recipesSchema.safeParse(recipes);
  const parsedId = z.uuid().nullable().safeParse(listId);
  if (!parsed.success || !parsedId.success) return { ok: false };

  const supabase = await createClient();
  let id = parsedId.data;
  if (!id) {
    const { data: created, error } = await supabase
      .from("shopping_lists")
      .insert({})
      .select("id")
      .single();
    if (error || !created) return { ok: false };
    id = created.id;
  }

  const { error } = await supabase.rpc("set_list_recipes", {
    target_list: id,
    recipes: parsed.data.map((r) => ({ recipe_id: r.recipeId, servings: r.servings })),
  });
  if (error) return { ok: false };

  revalidatePath("/nouvelle-liste/revue");
  return { ok: true, listId: id };
}

const lineSchema = z.object({
  key: z.string().min(1).max(200),
  itemId: z.uuid(),
  section: z.enum(["main", "staple"]),
  computedQuantity: z.number().positive(),
  quantity: z.number().positive().max(100000),
  unit: z.string().min(1).max(20),
  included: z.boolean(),
  adjusted: z.boolean(),
  changed: z.boolean(),
  recipeIds: z.array(z.uuid()),
});

/** Étape 2 : enregistre la revue des ingrédients (toutes les lignes, en un bloc). */
export async function saveReviewLines(
  listId: string,
  lines: z.infer<typeof lineSchema>[],
): Promise<{ ok: boolean }> {
  const parsedId = z.uuid().safeParse(listId);
  const parsed = z.array(lineSchema).max(500).safeParse(lines);
  if (!parsedId.success || !parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_review", {
    target_list: parsedId.data,
    lines: parsed.data.map((l) => ({
      item_id: l.itemId,
      line_key: l.key,
      origin: l.section === "staple" ? "staple" : "recipe",
      computed_quantity: l.computedQuantity,
      quantity: l.quantity,
      unit: l.unit,
      included: l.included,
      adjusted: l.adjusted,
      changed: l.changed,
      recipe_ids: l.recipeIds,
    })),
  });
  return { ok: !error };
}
