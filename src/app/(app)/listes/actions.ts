"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { undecidedCarryover } from "@/lib/carryover";

import { consolidateLines, findMergeTarget, type LineOrigin } from "@/lib/list-lines";
import { createClient } from "@/lib/supabase/server";
import { type ItemConversion, roundQuantity } from "@/lib/units";

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

  // Pas de revalidatePath ici : appelé depuis la page en cours d'édition, il forcerait
  // Next.js à recharger cette page (petit « clignotement » à chaque choix de recette).
  // Les pages Revue et Mes listes relisent de toute façon la base à chaque visite.
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

/** Supprimer une liste (seul son créateur le peut : règle d'accès « Supprimer mes listes »). */
export async function deleteList(listId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(listId);
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("shopping_lists")
    .delete({ count: "exact" })
    .eq("id", id.data);
  revalidatePath("/listes");
  return { ok: !error && count === 1 };
}

const extraSchema = z.object({
  itemId: z.uuid(),
  origin: z.enum(["prelist", "free", "carryover"]),
  quantity: z.number().positive().max(100000),
  unit: z.string().min(1).max(20),
  included: z.boolean().default(true), // report retiré : enregistré « non retenu »
});

/** Étape 3 : enregistre les articles de la pré-liste cochés et les articles libres. */
export async function saveExtras(
  listId: string,
  lines: z.input<typeof extraSchema>[],
): Promise<{ ok: boolean }> {
  const parsedId = z.uuid().safeParse(listId);
  const parsed = z.array(extraSchema).max(500).safeParse(lines);
  if (!parsedId.success || !parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_extras", {
    target_list: parsedId.data,
    lines: parsed.data.map((l) => ({
      item_id: l.itemId,
      // Un report garde son unité dans la clé (un article peut être reporté en deux unités)
      line_key:
        l.origin === "carryover" ? `carryover:${l.itemId}:${l.unit}` : `${l.origin}:${l.itemId}`,
      origin: l.origin,
      quantity: l.quantity,
      unit: l.unit,
      included: l.included,
    })),
  });
  return { ok: !error };
}

const prelistSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().positive().max(100000),
  unit: z.string().min(1).max(20),
});

/** Ajouter un article à ma pré-liste, ou changer sa quantité habituelle. */
export async function upsertPrelistItem(
  entry: z.infer<typeof prelistSchema>,
): Promise<{ ok: boolean }> {
  const parsed = prelistSchema.safeParse(entry);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false };

  const { error } = await supabase.from("prelist_items").upsert({
    user_id: userId,
    item_id: parsed.data.itemId,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    position: 1000, // ajouté par moi : en fin de pré-liste
  });
  return { ok: !error };
}

/** Retirer un article de ma pré-liste (il reste au catalogue). */
export async function removePrelistItem(itemId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(itemId);
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("prelist_items").delete().eq("item_id", id.data);
  return { ok: !error };
}

/**
 * « Terminer la liste » : les lignes de préparation (revue, pré-liste, articles libres)
 * sont regroupées, une ligne par article (consolidateLines), puis la liste devient prête.
 */
export async function finishList(listId: string): Promise<{ ok: false } | never> {
  const id = z.uuid().safeParse(listId);
  if (!id.success) return { ok: false };
  const supabase = await createClient();

  const [{ data: saved }, { data: pool }] = await Promise.all([
    supabase
      .from("shopping_list_items")
      .select("item_id, origin, quantity, unit, included, recipe_ids")
      .eq("list_id", id.data),
    supabase.from("carryover_items").select("item_id, quantity, unit"),
  ]);
  // Reports jamais décidés à l'étape 3 (étape passée sans rien toucher) : gardés par défaut
  const undecided = undecidedCarryover(
    (pool ?? []).map((p) => ({ itemId: p.item_id, unit: p.unit, quantity: Number(p.quantity) })),
    (saved ?? [])
      .filter((l) => l.origin === "carryover")
      .map((l) => ({ itemId: l.item_id, unit: l.unit })),
  );
  const lines = [
    ...(saved ?? []),
    ...undecided.map((c) => ({
      item_id: c.itemId,
      origin: "carryover",
      quantity: c.quantity,
      unit: c.unit,
      included: true,
      recipe_ids: [] as string[],
    })),
  ];
  const itemIds = [...new Set(lines.map((l) => l.item_id))];
  const { data: conversions } = itemIds.length
    ? await supabase
        .from("unit_conversions")
        .select("item_id, from_unit, to_unit, factor")
        .in("item_id", itemIds)
    : { data: [] };

  const conversionsByItem = new Map<string, ItemConversion[]>();
  for (const c of conversions ?? []) {
    conversionsByItem.set(c.item_id, [
      ...(conversionsByItem.get(c.item_id) ?? []),
      { fromUnit: c.from_unit, toUnit: c.to_unit, factor: Number(c.factor) },
    ]);
  }

  const final = consolidateLines(
    lines.map((l) => ({
      itemId: l.item_id,
      origin: l.origin as LineOrigin,
      quantity: Number(l.quantity),
      unit: l.unit,
      included: l.included,
      recipeIds: l.recipe_ids,
    })),
    conversionsByItem,
  );

  const { error } = await supabase.rpc("finalize_list", {
    target_list: id.data,
    lines: final.map((l) => ({
      item_id: l.itemId,
      origin: l.origin,
      quantity: l.quantity,
      unit: l.unit,
      recipe_ids: l.recipeIds,
    })),
  });
  if (error) return { ok: false };

  revalidatePath("/listes");
  redirect(`/listes/${id.data}`);
}

const amountSchema = z.object({
  quantity: z.number().positive().max(100000),
  unit: z.string().min(1).max(20),
});

/** Page de la liste : changer la quantité ou l'unité d'une ligne. */
export async function updateListLine(
  lineId: string,
  amount: z.infer<typeof amountSchema>,
): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(lineId);
  const parsed = amountSchema.safeParse(amount);
  if (!id.success || !parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ quantity: parsed.data.quantity, unit: parsed.data.unit, adjusted: true })
    .eq("id", id.data);
  return { ok: !error };
}

/** Page de la liste : retirer une ligne. */
export async function removeListLine(lineId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(lineId);
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", id.data);
  return { ok: !error };
}

/**
 * Page de la liste : ajouter un article. S'il y est déjà dans une unité compatible,
 * sa ligne est augmentée (une seule ligne par article) ; sinon une ligne est ajoutée.
 */
export async function addListLine(
  listId: string,
  itemId: string,
  amount: z.infer<typeof amountSchema>,
): Promise<{ ok: boolean }> {
  const list = z.uuid().safeParse(listId);
  const item = z.uuid().safeParse(itemId);
  const parsed = amountSchema.safeParse(amount);
  if (!list.success || !item.success || !parsed.success) return { ok: false };
  const supabase = await createClient();

  const [{ data: existing }, { data: conversions }] = await Promise.all([
    supabase
      .from("shopping_list_items")
      .select("id, item_id, quantity, unit")
      .eq("list_id", list.data)
      .eq("item_id", item.data)
      .eq("included", true)
      // En courses, un article déjà coché (déjà dans le panier) n'est pas augmenté :
      // le nouvel ajout fait une nouvelle ligne, à prendre
      .eq("checked", false),
    supabase.from("unit_conversions").select("from_unit, to_unit, factor").eq("item_id", item.data),
  ]);
  const target = findMergeTarget(
    (existing ?? []).map((l) => ({ itemId: l.item_id, unit: l.unit })),
    item.data,
    parsed.data.quantity,
    parsed.data.unit,
    (conversions ?? []).map((c) => ({
      fromUnit: c.from_unit,
      toUnit: c.to_unit,
      factor: Number(c.factor),
    })),
  );

  const { error } = target
    ? await supabase
        .from("shopping_list_items")
        .update({
          quantity: roundQuantity(Number(existing![target.index].quantity) + target.added),
        })
        .eq("id", existing![target.index].id)
    : await supabase.from("shopping_list_items").insert({
        list_id: list.data,
        item_id: item.data,
        line_key: `extra:${crypto.randomUUID()}`,
        origin: "free",
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
      });
  revalidatePath(`/listes/${list.data}`);
  revalidatePath(`/courses/${list.data}`);
  return { ok: !error };
}
