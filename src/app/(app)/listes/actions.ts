"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { consolidateLines, findMergeTarget, planAddition, type LineOrigin } from "@/lib/list-lines";
import { currentUserId, loadConversions } from "@/lib/my-catalogue";
import { createClient } from "@/lib/supabase/server";
import { roundQuantity } from "@/lib/units";

/**
 * « Nouvelle liste » dans Mes listes (US-LST-08) : une liste sans recette, qui commence
 * directement à la pré-liste. Les listes avec recettes se créent depuis un menu (US-MEN-02).
 */
export async function createEmptyList(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shopping_lists").insert({}).select("id").single();
  if (error || !data) throw new Error("La liste n'a pas pu être créée");
  revalidatePath("/listes");
  redirect(`/listes/${data.id}/pre-liste`);
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

/** Renoncer à une liste qu'on me partage (US-LST-09) : je ne la vois plus, elle reste à son créateur. */
export async function leaveList(listId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(listId);
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { ok: false };
  const { error, count } = await supabase
    .from("list_shares")
    .delete({ count: "exact" })
    .eq("list_id", id.data)
    .eq("shared_with", userId);
  revalidatePath("/listes");
  return { ok: !error && count === 1 };
}

const extraSchema = z.object({
  itemId: z.uuid(),
  origin: z.enum(["prelist", "free"]),
  quantity: z.number().positive().max(100000),
  unit: z.string().min(1).max(20),
  included: z.boolean().default(true),
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
      line_key: `${l.origin}:${l.itemId}`,
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

  const { data: saved } = await supabase
    .from("shopping_list_items")
    .select("item_id, origin, quantity, unit, included, recipe_ids")
    .eq("list_id", id.data);
  const lines = saved ?? [];
  const itemIds = [...new Set(lines.map((l) => l.item_id))];
  // Mes conversions d'abord (comme dans la revue) : le regroupement final les respecte
  const conversionsByItem = await loadConversions(supabase, await currentUserId(supabase), itemIds);

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

  const [{ data: existing }, conversions] = await Promise.all([
    supabase
      .from("shopping_list_items")
      .select("id, item_id, quantity, unit")
      .eq("list_id", list.data)
      .eq("item_id", item.data)
      .eq("included", true)
      // En courses, un article déjà coché (déjà dans le panier) n'est pas augmenté :
      // le nouvel ajout fait une nouvelle ligne, à prendre
      .eq("checked", false),
    loadConversions(supabase, await currentUserId(supabase), [item.data]),
  ]);
  const target = findMergeTarget(
    (existing ?? []).map((l) => ({ itemId: l.item_id, unit: l.unit })),
    item.data,
    parsed.data.quantity,
    parsed.data.unit,
    conversions.get(item.data) ?? [], // les miennes d'abord
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

/**
 * « Verser » une liste dans une autre (US-LST-10, décision 070) : les articles NON cochés
 * de la liste de départ rejoignent la liste d'arrivée (même article pas encore coché,
 * unité compatible → quantités additionnées ; sinon nouvelle ligne), puis la liste de
 * départ est supprimée. Réservé à son créateur ; ni l'une ni l'autre n'est un brouillon.
 */
export async function mergeListInto(
  sourceId: string,
  targetId: string,
): Promise<{ ok: false } | never> {
  const source = z.uuid().safeParse(sourceId);
  const target = z.uuid().safeParse(targetId);
  if (!source.success || !target.success || source.data === target.data) return { ok: false };
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  // Les deux listes, avec leurs lignes (les règles d'accès ne montrent que les miennes et
  // celles qu'on me partage)
  const { data: lists } = await supabase
    .from("shopping_lists")
    .select(
      "id, owner_id, status, shopping_list_recipes(recipe_id, servings), shopping_list_items(id, item_id, origin, quantity, unit, included, checked, recipe_ids)",
    )
    .in("id", [source.data, target.data]);
  const from = lists?.find((l) => l.id === source.data);
  const to = lists?.find((l) => l.id === target.data);
  const open = (status: string) => status === "ready" || status === "shopping";
  if (!from || !to || from.owner_id !== userId || !open(from.status) || !open(to.status)) {
    return { ok: false };
  }

  // Lignes à verser : gardées et pas encore dans le panier
  const moving = from.shopping_list_items.filter((l) => l.included && !l.checked);
  const conversions = await loadConversions(supabase, userId, [
    ...new Set(moving.map((l) => l.item_id)),
  ]);
  const plan = planAddition(
    to.shopping_list_items.map((l) => ({
      id: l.id,
      itemId: l.item_id,
      quantity: Number(l.quantity),
      unit: l.unit,
      included: l.included,
      checked: l.checked,
      recipeIds: l.recipe_ids,
    })),
    moving.map((l) => ({
      itemId: l.item_id,
      quantity: Number(l.quantity),
      unit: l.unit,
      recipeIds: l.recipe_ids,
      origin: l.origin as LineOrigin,
    })),
    conversions,
  );

  const results = await Promise.all([
    ...plan.updates.map((u) =>
      supabase
        .from("shopping_list_items")
        .update({ quantity: u.quantity, recipe_ids: u.recipeIds })
        .eq("id", u.id),
    ),
    plan.inserts.length
      ? supabase.from("shopping_list_items").insert(
          plan.inserts.map((l) => ({
            list_id: to.id,
            item_id: l.itemId,
            line_key: `verse:${crypto.randomUUID()}`,
            origin: l.origin ?? "free",
            quantity: l.quantity,
            unit: l.unit,
            recipe_ids: l.recipeIds,
          })),
        )
      : Promise.resolve({ error: null }),
  ]);
  if (results.some((r) => r.error)) return { ok: false };

  // Les recettes suivent, pour afficher leurs titres (seulement si la liste d'arrivée est
  // à moi : les règles d'accès réservent ses recettes à son créateur)
  if (to.owner_id === userId) {
    const known = new Set(to.shopping_list_recipes.map((r) => r.recipe_id));
    const recipes = from.shopping_list_recipes.filter((r) => !known.has(r.recipe_id));
    if (recipes.length) {
      await supabase.from("shopping_list_recipes").insert(
        recipes.map((r, i) => ({
          list_id: to.id,
          recipe_id: r.recipe_id,
          servings: r.servings,
          position: to.shopping_list_recipes.length + i + 1,
        })),
      );
    }
  }

  // Enfin, la liste de départ disparaît
  const { error } = await supabase.from("shopping_lists").delete().eq("id", from.id);
  if (error) return { ok: false };
  revalidatePath("/listes");
  revalidatePath(`/listes/${to.id}`);
  revalidatePath(`/courses/${to.id}`);
  redirect(`/listes/${to.id}`);
}

/**
 * Renommer une liste (US-LST-11) : créateur et co-éditeurs. Un nom vide remet le titre
 * par défaut « Liste du [date] ».
 */
export async function renameList(listId: string, name: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(listId);
  const parsed = z.string().trim().max(60).safeParse(name);
  if (!id.success || !parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_list", {
    target_list: id.data,
    new_name: parsed.data,
  });
  revalidatePath("/listes");
  revalidatePath(`/listes/${id.data}`);
  revalidatePath("/courses");
  return { ok: !error };
}
