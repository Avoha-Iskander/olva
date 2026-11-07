import type { DraftRecipe, ListStatus } from "@/lib/lists";
import { createClient } from "@/lib/supabase/server";

/** La liste tirée d'un menu (la plus récente, s'il y en a eu plusieurs). */
export type MenuList = { id: string; status: ListStatus; hasRecipes: boolean };

/** Une recette du menu, avec la date d'ajout (US-MEN-03 s'en servira). */
export type MenuRecipe = DraftRecipe & { addedAt: string };

export type Menu = {
  id: string;
  name: string;
  createdAt: string;
  recipes: MenuRecipe[];
  list: MenuList | null;
};

/** Une carte de « Mes menus ». */
export type MenuSummary = {
  id: string;
  name: string;
  createdAt: string;
  recipeTitles: string[];
  list: MenuList | null;
};

type ListRow = { id: string; status: string; created_at: string; shopping_list_recipes: unknown[] };

/** Parmi les listes d'un menu, la plus récente. */
function latestList(lists: ListRow[]): MenuList | null {
  const latest = [...lists].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return latest
    ? {
        id: latest.id,
        status: latest.status as ListStatus,
        hasRecipes: latest.shopping_list_recipes.length > 0,
      }
    : null;
}

/**
 * « Mes menus » : du plus récent au plus ancien (US-MEN-04).
 * Une recette qu'on ne me partage plus n'a plus de titre lisible : elle est ignorée.
 */
export async function listMyMenus(): Promise<MenuSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("menus")
    .select(
      "id, name, created_at, menu_recipes(added_at, recipes(title)), shopping_lists(id, status, created_at, shopping_list_recipes(recipe_id))",
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    createdAt: m.created_at,
    recipeTitles: [...m.menu_recipes]
      .sort((a, b) => a.added_at.localeCompare(b.added_at))
      .map((r) => r.recipes?.title)
      .filter((t): t is string => Boolean(t)),
    list: latestList(m.shopping_lists),
  }));
}

/** Un menu (le mien), ou null s'il n'existe pas. */
export async function getMenu(id: string): Promise<Menu | null> {
  const supabase = await createClient();
  const { data: menu } = await supabase
    .from("menus")
    .select(
      "id, name, created_at, menu_recipes(recipe_id, servings, added_at, recipes(id)), shopping_lists(id, status, created_at, shopping_list_recipes(recipe_id))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!menu) return null;

  return {
    id: menu.id,
    name: menu.name,
    createdAt: menu.created_at,
    recipes: [...menu.menu_recipes]
      .filter((r) => r.recipes) // recette encore lisible (à moi ou partagée avec moi)
      .sort((a, b) => a.added_at.localeCompare(b.added_at))
      .map((r) => ({ recipeId: r.recipe_id, servings: r.servings, addedAt: r.added_at })),
    list: latestList(menu.shopping_lists),
  };
}
