"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { listHref } from "@/lib/lists";
import { defaultMenuName } from "@/lib/menu-name";
import { getMenu } from "@/lib/menus";
import { parseId } from "@/lib/menu-return";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/*
 * Actions serveur des menus (US-MEN-01 à 04, décision 068).
 * Les règles d'accès (RLS) garantissent qu'on ne touche qu'à SES menus : ces fonctions
 * vérifient la forme des données, la base vérifie les droits.
 */

const recipesSchema = z
  .array(z.object({ recipeId: z.uuid(), servings: z.number().int().min(1).max(50) }))
  .max(50);

/** « Nouveau menu » : crée un menu « Semaine du … » et l'ouvre. */
export async function createMenu(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .insert({ name: defaultMenuName(new Date()) })
    .select("id")
    .single();
  if (error || !data) throw new Error("Le menu n'a pas pu être créé");
  redirect(`/menus/${data.id}`);
}

/**
 * Enregistre les recettes du menu et leurs portions (enregistrement automatique).
 * « upsert » = insérer, ou mettre à jour si la recette est déjà là : une recette déjà
 * présente garde ainsi sa date d'ajout (utile pour « Pas encore dans la liste »).
 */
export async function saveMenuRecipes(
  menuId: string,
  recipes: { recipeId: string; servings: number }[],
): Promise<{ ok: boolean }> {
  const id = parseId(menuId);
  const parsed = recipesSchema.safeParse(recipes);
  if (!id || !parsed.success) return { ok: false };

  const supabase = await createClient();
  if (parsed.data.length) {
    const { error } = await supabase.from("menu_recipes").upsert(
      parsed.data.map((r) => ({ menu_id: id, recipe_id: r.recipeId, servings: r.servings })),
      { onConflict: "menu_id,recipe_id" },
    );
    if (error) return { ok: false };
  }

  // Puis on retire les recettes qui ne sont plus choisies
  let removal = supabase.from("menu_recipes").delete().eq("menu_id", id);
  if (parsed.data.length) {
    removal = removal.not("recipe_id", "in", `(${parsed.data.map((r) => r.recipeId).join(",")})`);
  }
  const { error } = await removal;
  return { ok: !error };
}

/** Renommer un menu. */
export async function renameMenu(menuId: string, name: string): Promise<{ ok: boolean }> {
  const id = parseId(menuId);
  const parsed = z.string().trim().min(1).max(80).safeParse(name);
  if (!id || !parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("menus").update({ name: parsed.data }).eq("id", id);
  revalidatePath("/menus");
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
