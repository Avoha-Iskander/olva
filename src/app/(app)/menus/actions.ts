"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { planAddition } from "@/lib/list-lines";
import { getList, listHref } from "@/lib/lists";
import { defaultMenuName } from "@/lib/menu-name";
import { getMenu } from "@/lib/menus";
import { parseId } from "@/lib/menu-return";
import { loadItemsDetails } from "@/lib/my-catalogue";
import { getCurrentProfile } from "@/lib/profile";
import { computeReview } from "@/lib/review";
import { createClient } from "@/lib/supabase/server";

/*
 * Actions serveur des menus (US-MEN-01 à 04, décision 068).
 * Les règles d'accès (RLS) garantissent qu'on ne touche qu'à SES menus : ces fonctions
 * vérifient la forme des données, la base vérifie les droits.
 */

const recipesSchema = z
  .array(z.object({ recipeId: z.uuid(), servings: z.number().int().min(1).max(50) }))
  .max(50);

const menuSchema = z.object({
  name: z.string().trim().min(1).max(80),
  recipes: recipesSchema,
});

/**
 * « Enregistrer le menu » (US-MEN-01, décision 069) : crée le menu (menuId null) ou met à
 * jour son nom et ses recettes. Renvoie l'identifiant du menu ; c'est l'écran qui décide
 * où aller ensuite (fiche du menu, ou création de la liste).
 */
export async function saveMenu(
  menuId: string | null,
  input: { name: string; recipes: { recipeId: string; servings: number }[] },
): Promise<{ ok: true; menuId: string } | { ok: false }> {
  const parsed = menuSchema.safeParse(input);
  const existingId = menuId === null ? null : parseId(menuId);
  if (!parsed.success || (menuId !== null && !existingId)) return { ok: false };
  const { name, recipes } = parsed.data;
  const supabase = await createClient();

  // 1. Le menu lui-même : création, ou nouveau nom
  let id = existingId;
  if (!id) {
    const { data, error } = await supabase.from("menus").insert({ name }).select("id").single();
    if (error || !data) return { ok: false };
    id = data.id;
  } else {
    const { error, count } = await supabase
      .from("menus")
      .update({ name }, { count: "exact" })
      .eq("id", id);
    if (error || count !== 1) return { ok: false };
  }

  // 2. Ses recettes. « upsert » = insérer, ou mettre à jour si la recette est déjà là :
  //    une recette déjà présente garde ainsi sa date d'ajout.
  if (recipes.length) {
    const { error } = await supabase.from("menu_recipes").upsert(
      recipes.map((r) => ({ menu_id: id, recipe_id: r.recipeId, servings: r.servings })),
      { onConflict: "menu_id,recipe_id" },
    );
    if (error) return { ok: false };
  }
  // 3. On retire les recettes qui ne sont plus choisies
  let removal = supabase.from("menu_recipes").delete().eq("menu_id", id);
  if (recipes.length) {
    removal = removal.not("recipe_id", "in", `(${recipes.map((r) => r.recipeId).join(",")})`);
  }
  const { error } = await removal;
  if (error) return { ok: false };

  revalidatePath("/menus");
  revalidatePath(`/menus/${id}`);
  return { ok: true, menuId: id };
}

/** Fiche du menu (US-MEN-05) : changer les portions d'une recette du menu. */
export async function setMenuRecipeServings(
  menuId: string,
  recipeId: string,
  servings: number,
): Promise<{ ok: boolean }> {
  const id = parseId(menuId);
  const recipe = parseId(recipeId);
  const parsed = z.number().int().min(1).max(50).safeParse(servings);
  if (!id || !recipe || !parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("menu_recipes")
    .update({ servings: parsed.data }, { count: "exact" })
    .eq("menu_id", id)
    .eq("recipe_id", recipe);
  revalidatePath(`/menus/${id}`);
  return { ok: !error && count === 1 };
}

/** Fiche du menu (US-MEN-05) : retirer une recette du menu (la liste n'est pas touchée). */
export async function removeRecipeFromMenu(
  menuId: string,
  recipeId: string,
): Promise<{ ok: boolean }> {
  const id = parseId(menuId);
  const recipe = parseId(recipeId);
  if (!id || !recipe) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_recipes")
    .delete()
    .eq("menu_id", id)
    .eq("recipe_id", recipe);
  revalidatePath("/menus");
  revalidatePath(`/menus/${id}`);
  return { ok: !error };
}

/** Supprimer un menu : sa liste éventuelle est gardée (le lien est simplement vidé). */
export async function deleteMenu(menuId: string): Promise<{ ok: boolean }> {
  const id = parseId(menuId);
  if (!id) return { ok: false };
  const supabase = await createClient();
  const { error, count } = await supabase.from("menus").delete({ count: "exact" }).eq("id", id);
  revalidatePath("/menus");
  return { ok: !error && count === 1 };
}

/** Renoncer à un menu qu'on me partage (décision 077) : je ne le vois plus, il reste à son créateur. */
export async function leaveMenu(menuId: string): Promise<{ ok: boolean }> {
  const id = parseId(menuId);
  if (!id) return { ok: false };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false };
  const { error, count } = await supabase
    .from("menu_shares")
    .delete({ count: "exact" })
    .eq("menu_id", id)
    .eq("shared_with", userId);
  revalidatePath("/menus");
  return { ok: !error && count === 1 };
}

/** « Dupliquer » : nouveau menu (nom par défaut) avec les mêmes recettes et portions, sans liste. */
export async function duplicateMenu(menuId: string): Promise<{ ok: false } | never> {
  const id = parseId(menuId);
  const source = id ? await getMenu(id) : null;
  if (!source) return { ok: false };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("menus")
    .insert({ name: defaultMenuName(new Date()) })
    .select("id")
    .single();
  if (error || !created) return { ok: false };

  if (source.recipes.length) {
    const { error: copyError } = await supabase.from("menu_recipes").insert(
      source.recipes.map((r) => ({
        menu_id: created.id,
        recipe_id: r.recipeId,
        servings: r.servings,
        added_at: r.addedAt, // garde l'ordre des recettes du menu d'origine
      })),
    );
    if (copyError) return { ok: false };
  }
  revalidatePath("/menus");
  redirect(`/menus/${created.id}`);
}

/**
 * « Créer une recette » depuis un menu : une fois la recette enregistrée, elle est
 * ajoutée au menu, pour le nombre de personnes par défaut (pas de doublon).
 */
export async function addRecipeToMenu(menuId: string, recipeId: string): Promise<{ ok: boolean }> {
  const id = parseId(menuId);
  const recipe = parseId(recipeId);
  const profile = await getCurrentProfile();
  if (!id || !recipe || !profile) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_recipes")
    .upsert(
      { menu_id: id, recipe_id: recipe, servings: profile.default_servings },
      { onConflict: "menu_id,recipe_id", ignoreDuplicates: true },
    );
  return { ok: !error };
}

/**
 * « Créer la liste » (US-MEN-02) : nouvelle liste rattachée au menu, avec ses recettes et
 * portions, puis ouverture de la revue des ingrédients.
 */
export async function createListFromMenu(menuId: string): Promise<{ ok: false } | never> {
  const id = parseId(menuId);
  const menu = id ? await getMenu(id) : null;
  if (!menu || menu.recipes.length === 0) return { ok: false };
  // Le menu a déjà une liste pas terminée : on l'ouvre plutôt que d'en créer une deuxième
  if (menu.list && menu.list.status !== "done") redirect(listHref(menu.list));

  const supabase = await createClient();
  const { data: list, error } = await supabase
    .from("shopping_lists")
    .insert({ menu_id: menu.id })
    .select("id")
    .single();
  if (error || !list) return { ok: false };

  const { error: recipesError } = await supabase.rpc("set_list_recipes", {
    target_list: list.id,
    recipes: menu.recipes.map((r) => ({ recipe_id: r.recipeId, servings: r.servings })),
  });
  if (recipesError) {
    await supabase.from("shopping_lists").delete().eq("id", list.id); // pas de liste vide orpheline
    return { ok: false };
  }
  revalidatePath("/menus");
  revalidatePath("/listes");
  redirect(`/listes/${list.id}/revue`);
}

/**
 * « Ajouter à la liste » (US-MEN-03) : une recette ajoutée au menu après la création de
 * la liste la rejoint.
 * - Liste en brouillon : la recette rejoint la revue, qui se recalcule en gardant mes
 *   ajustements.
 * - Liste prête ou en courses : ses ingrédients sont fusionnés dans la liste (même article →
 *   quantités additionnées ; ingrédients de base non ajoutés). Le temps réel prévient les
 *   personnes avec qui la liste est partagée.
 */
export async function addMenuRecipeToList(
  menuId: string,
  recipeId: string,
): Promise<{ ok: boolean }> {
  const id = parseId(menuId);
  const recipe = parseId(recipeId);
  const menu = id ? await getMenu(id) : null;
  const choice = menu?.recipes.find((r) => r.recipeId === recipe);
  if (!menu || !choice || !menu.list || menu.list.status === "done") return { ok: false };
  const list = await getList(menu.list.id);
  if (!list || list.status === "done") return { ok: false };
  if (list.recipes.some((r) => r.recipeId === choice.recipeId)) return { ok: true }; // déjà là

  const supabase = await createClient();
  const refresh = () => {
    revalidatePath(`/menus/${menu.id}`);
    revalidatePath(`/listes/${list.id}`);
    revalidatePath(`/courses/${list.id}`);
  };

  // Brouillon : la revue (étape 1) refera le calcul à partir des recettes de la liste
  if (list.status === "draft") {
    const { error } = await supabase.rpc("set_list_recipes", {
      target_list: list.id,
      recipes: [...list.recipes, choice].map((r) => ({
        recipe_id: r.recipeId,
        servings: r.servings,
      })),
    });
    refresh();
    return { ok: !error };
  }

  // Liste prête ou en courses : on calcule les ingrédients de la recette pour ses portions…
  const { data: source } = await supabase
    .from("recipes")
    .select("id, servings, recipe_ingredients(item_id, quantity, unit)")
    .eq("id", choice.recipeId)
    .maybeSingle();
  if (!source) return { ok: false };
  const catalogue = await loadItemsDetails(
    supabase,
    source.recipe_ingredients.map((i) => i.item_id),
  );
  const computed = computeReview(
    [
      {
        recipeId: source.id,
        baseServings: source.servings,
        servings: choice.servings,
        ingredients: source.recipe_ingredients.map((i) => ({
          itemId: i.item_id,
          quantity: i.quantity === null ? null : Number(i.quantity),
          unit: i.unit,
        })),
      },
    ],
    catalogue,
  ).filter((l) => l.section === "main"); // les ingrédients de base ne sont pas ajoutés

  // … puis on les fusionne avec les lignes déjà dans la liste
  const { data: existing, error: readError } = await supabase
    .from("shopping_list_items")
    .select("id, item_id, quantity, unit, included, checked, recipe_ids")
    .eq("list_id", list.id);
  if (readError) return { ok: false };
  const plan = planAddition(
    (existing ?? []).map((l) => ({
      id: l.id,
      itemId: l.item_id,
      quantity: Number(l.quantity),
      unit: l.unit,
      included: l.included,
      checked: l.checked,
      recipeIds: l.recipe_ids,
    })),
    computed.map((l) => ({
      itemId: l.itemId,
      quantity: l.quantity,
      unit: l.unit,
      recipeIds: l.recipeIds,
    })),
    new Map([...catalogue].map(([itemId, item]) => [itemId, item.conversions])),
  );

  // La recette apparaît dans la liste (titre sur la carte, origine des lignes)
  const { error: recipeError } = await supabase.from("shopping_list_recipes").insert({
    list_id: list.id,
    recipe_id: choice.recipeId,
    servings: choice.servings,
    position: list.recipes.length + 1,
  });
  if (recipeError) return { ok: false };

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
            list_id: list.id,
            item_id: l.itemId,
            line_key: `menu:${crypto.randomUUID()}`,
            origin: "recipe",
            quantity: l.quantity,
            unit: l.unit,
            recipe_ids: l.recipeIds,
          })),
        )
      : Promise.resolve({ error: null }),
  ]);
  refresh();
  return { ok: results.every((r) => !r.error) };
}
