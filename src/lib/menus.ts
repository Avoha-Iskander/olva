import type { DraftRecipe, ListStatus } from "@/lib/lists";
import { createClient } from "@/lib/supabase/server";

/** La liste tirée d'un menu (la plus récente, s'il y en a eu plusieurs). */
export type MenuList = {
  id: string;
  status: ListStatus;
  hasRecipes: boolean;
  recipeIds: string[]; // recettes déjà dans la liste (« Pas encore dans la liste », US-MEN-03)
};

/** Une recette du menu, avec sa date d'ajout. */
export type MenuRecipe = DraftRecipe & { addedAt: string };

export type Menu = {
  id: string;
  name: string;
  sharedBy: string | null; // menu qu'on me partage : nom du créateur (null : c'est le mien)
  createdAt: string;
  recipes: MenuRecipe[];
  list: MenuList | null;
};

/** Une carte de « Mes menus ». */
export type MenuSummary = {
  id: string;
  name: string;
  sharedBy: string | null; // menu qu'on me partage (co-édition, décision 077)
  createdAt: string;
  recipeTitles: string[];
  list: MenuList | null;
};

type ListRow = {
  id: string;
  status: string;
  created_at: string;
  shopping_list_recipes: { recipe_id: string }[];
};

/** Parmi les listes d'un menu, la plus récente. */
function latestList(lists: ListRow[]): MenuList | null {
  const latest = [...lists].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return latest
    ? {
        id: latest.id,
        status: latest.status as ListStatus,
        hasRecipes: latest.shopping_list_recipes.length > 0,
        recipeIds: latest.shopping_list_recipes.map((r) => r.recipe_id),
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
      "id, owner_id, name, created_at, menu_recipes(added_at, recipes(title)), shopping_lists(id, status, created_at, shopping_list_recipes(recipe_id))",
    )
    .order("created_at", { ascending: false });
  const names = await sharerNames(
    supabase,
    (data ?? []).map((m) => m.owner_id),
  );

  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    sharedBy: names.get(m.owner_id) ?? null,
    createdAt: m.created_at,
    recipeTitles: [...m.menu_recipes]
      .sort((a, b) => a.added_at.localeCompare(b.added_at))
      .map((r) => r.recipes?.title)
      .filter((t): t is string => Boolean(t)),
    list: latestList(m.shopping_lists),
  }));
}

/**
 * Créateurs des menus qu'on me partage → nom affiché. Mes propres menus n'y sont pas :
 * pour eux, `get` renvoie undefined (donc « pas partagé »).
 */
async function sharerNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerIds: string[],
): Promise<Map<string, string>> {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const others = [...new Set(ownerIds)].filter((id) => id !== userId);
  if (!others.length) return new Map();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", others);
  return new Map(
    others.map((id) => [id, profiles?.find((p) => p.id === id)?.display_name || "Quelqu'un"]),
  );
}

/** Un menu (le mien ou partagé avec moi), ou null s'il n'existe pas. */
export async function getMenu(id: string): Promise<Menu | null> {
  const supabase = await createClient();
  const { data: menu } = await supabase
    .from("menus")
    .select(
      "id, owner_id, name, created_at, menu_recipes(recipe_id, servings, added_at, recipes(id)), shopping_lists(id, status, created_at, shopping_list_recipes(recipe_id))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!menu) return null;
  const names = await sharerNames(supabase, [menu.owner_id]);

  return {
    id: menu.id,
    name: menu.name,
    sharedBy: names.get(menu.owner_id) ?? null,
    createdAt: menu.created_at,
    recipes: [...menu.menu_recipes]
      .filter((r) => r.recipes) // recette encore lisible (à moi ou partagée avec moi)
      .sort((a, b) => a.added_at.localeCompare(b.added_at))
      .map((r) => ({ recipeId: r.recipe_id, servings: r.servings, addedAt: r.added_at })),
    list: latestList(menu.shopping_lists),
  };
}
