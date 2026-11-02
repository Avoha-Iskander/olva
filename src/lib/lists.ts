import {
  computeReview,
  mergeReview,
  type ReviewItem,
  type ReviewLine,
  type SelectedRecipe,
} from "@/lib/review";
import { createClient } from "@/lib/supabase/server";

export type DraftRecipe = { recipeId: string; servings: number };
export type ListStatus = "draft" | "ready" | "shopping" | "done";
export type Draft = { id: string; status: ListStatus; recipes: DraftRecipe[] };

/** Une liste (statut + recettes choisies), ou null si elle n'existe pas ou n'est pas à moi. */
export async function getList(id: string): Promise<Draft | null> {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("shopping_lists")
    .select("id, status, shopping_list_recipes(recipe_id, servings, position)")
    .eq("id", id)
    .maybeSingle();
  if (!list) return null;

  return {
    id: list.id,
    status: list.status as ListStatus,
    recipes: [...list.shopping_list_recipes]
      .sort((a, b) => a.position - b.position)
      .map((r) => ({ recipeId: r.recipe_id, servings: r.servings })),
  };
}

/** Une carte de « Mes listes en cours ». */
export type ListSummary = {
  id: string;
  status: ListStatus;
  createdAt: string;
  recipeTitles: string[];
  itemCount: number; // articles retenus
  sharedBy: string | null; // nom de la personne qui me partage la liste (null : la mienne)
};

/** Nom affiché des créateurs des listes qu'on me partage. */
async function ownerNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerIds: string[],
): Promise<{ userId: string | null; names: Map<string, string> }> {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? null;
  const others = [...new Set(ownerIds.filter((id) => id !== userId))];
  if (!others.length) return { userId, names: new Map() };
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", others);
  return {
    userId,
    names: new Map((data ?? []).map((p) => [p.id, p.display_name || "Quelqu'un"])),
  };
}

/** Mes listes pas encore terminées (brouillons, prêtes, en cours de courses), les plus récentes d'abord. */
export async function listMyLists(): Promise<ListSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shopping_lists")
    .select(
      "id, owner_id, status, created_at, shopping_list_recipes(position, recipes(title)), shopping_list_items(included)",
    )
    .neq("status", "done")
    .order("updated_at", { ascending: false });
  const { userId, names } = await ownerNames(
    supabase,
    (data ?? []).map((l) => l.owner_id),
  );

  return (data ?? []).map((l) => ({
    id: l.id,
    status: l.status as ListStatus,
    createdAt: l.created_at,
    recipeTitles: [...l.shopping_list_recipes]
      .sort((a, b) => a.position - b.position)
      .map((r) => r.recipes?.title)
      .filter((t): t is string => Boolean(t)),
    itemCount: l.shopping_list_items.filter((i) => i.included).length,
    sharedBy: l.owner_id === userId ? null : (names.get(l.owner_id) ?? "Quelqu'un"),
  }));
}

/** Adresse où reprendre une liste : son étape en cours (brouillon) ou sa page. */
export function listHref(list: { id: string; status: ListStatus; hasRecipes: boolean }) {
  if (list.status !== "draft") return `/listes/${list.id}`;
  return list.hasRecipes ? `/listes/${list.id}/revue` : `/listes/${list.id}/recettes`;
}

/** Tout ce qu'il faut pour afficher la revue (étape 2) d'un brouillon. */
export type ReviewData = {
  listId: string;
  recipeTitles: Record<string, string>;
  lines: ReviewLine[];
};

/**
 * Prépare la revue des ingrédients : lit les recettes choisies, leurs ingrédients,
 * les articles et leurs conversions, calcule (computeReview), puis fusionne avec
 * la revue déjà enregistrée (mergeReview) pour garder mes ajustements.
 */
export async function getReview(draft: Draft): Promise<ReviewData> {
  const supabase = await createClient();
  const recipeIds = draft.recipes.map((r) => r.recipeId);

  const [{ data: recipes }, { data: saved }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, servings, recipe_ingredients(item_id, quantity, unit)")
      .in("id", recipeIds),
    supabase
      .from("shopping_list_items")
      .select(
        "line_key, origin, computed_quantity, quantity, unit, included, adjusted, changed, item_id, recipe_ids",
      )
      .eq("list_id", draft.id)
      .in("origin", ["recipe", "staple"]),
  ]);

  const itemIds = [
    ...new Set((recipes ?? []).flatMap((r) => r.recipe_ingredients.map((i) => i.item_id))),
  ];
  const [{ data: items }, { data: conversions }] = itemIds.length
    ? await Promise.all([
        supabase
          .from("items")
          .select("id, name, default_unit, is_staple, purchase_unit, aisles(position)")
          .in("id", itemIds),
        supabase
          .from("unit_conversions")
          .select("item_id, from_unit, to_unit, factor")
          .in("item_id", itemIds),
      ])
    : [{ data: [] }, { data: [] }];

  const catalogue = new Map<string, ReviewItem>(
    (items ?? []).map((i) => [
      i.id,
      {
        id: i.id,
        name: i.name,
        aislePosition: i.aisles?.position ?? 99,
        defaultUnit: i.default_unit,
        isStaple: i.is_staple,
        purchaseUnit: i.purchase_unit,
        conversions: (conversions ?? [])
          .filter((c) => c.item_id === i.id)
          .map((c) => ({ fromUnit: c.from_unit, toUnit: c.to_unit, factor: Number(c.factor) })),
      },
    ]),
  );

  const recipeById = new Map((recipes ?? []).map((r) => [r.id, r]));
  const selected: SelectedRecipe[] = draft.recipes.flatMap((choice) => {
    const recipe = recipeById.get(choice.recipeId);
    if (!recipe) return []; // recette supprimée ou plus partagée depuis
    return [
      {
        recipeId: recipe.id,
        baseServings: recipe.servings,
        servings: choice.servings,
        ingredients: recipe.recipe_ingredients.map((i) => ({
          itemId: i.item_id,
          quantity: i.quantity === null ? null : Number(i.quantity),
          unit: i.unit,
        })),
      },
    ];
  });

  // La revue enregistrée, remise sous forme de lignes (le nom et le rayon viennent du calcul)
  const previous: ReviewLine[] = (saved ?? []).map((l) => ({
    key: l.line_key,
    itemId: l.item_id,
    name: "",
    aislePosition: 0,
    section: l.origin === "staple" ? "staple" : "main",
    quantity: Number(l.quantity),
    unit: l.unit,
    includedByDefault: l.origin !== "staple",
    recipeIds: l.recipe_ids,
    computedQuantity: Number(l.computed_quantity ?? l.quantity),
    included: l.included,
    adjusted: l.adjusted,
    changed: l.changed,
  }));

  return {
    listId: draft.id,
    recipeTitles: Object.fromEntries((recipes ?? []).map((r) => [r.id, r.title])),
    lines: mergeReview(previous, computeReview(selected, catalogue)),
  };
}

/** Un article de ma pré-liste (ou une ligne « pré-liste » / « article libre » d'une liste). */
export type ExtraItem = {
  itemId: string;
  name: string;
  aislePosition: number;
  quantity: number;
  unit: string;
};

/** Étape 3 : ma pré-liste (créée par défaut la première fois) et les lignes déjà ajoutées. */
export async function getExtras(listId: string): Promise<{
  prelist: ExtraItem[];
  checked: ExtraItem[]; // articles de la pré-liste cochés pour cette liste
  free: ExtraItem[]; // articles libres ajoutés à cette liste
}> {
  const supabase = await createClient();
  await supabase.rpc("ensure_my_prelist");

  const [{ data: prelist }, { data: lines }] = await Promise.all([
    supabase
      .from("prelist_items")
      .select("item_id, quantity, unit, position, items(name, aisles(position))")
      .order("position"),
    supabase
      .from("shopping_list_items")
      .select("item_id, origin, quantity, unit, items(name, aisles(position))")
      .eq("list_id", listId)
      .in("origin", ["prelist", "free"])
      .order("created_at"),
  ]);

  const toExtra = (row: {
    item_id: string;
    quantity: number;
    unit: string;
    items: { name: string; aisles: { position: number } | null } | null;
  }): ExtraItem => ({
    itemId: row.item_id,
    name: row.items?.name ?? "",
    aislePosition: row.items?.aisles?.position ?? 99,
    quantity: Number(row.quantity),
    unit: row.unit,
  });

  return {
    prelist: (prelist ?? []).map(toExtra),
    checked: (lines ?? []).filter((l) => l.origin === "prelist").map(toExtra),
    free: (lines ?? []).filter((l) => l.origin === "free").map(toExtra),
  };
}

/** Une ligne de la page d'une liste. */
export type ListLine = {
  id: string;
  itemId: string;
  name: string;
  aisleName: string;
  aislePosition: number;
  quantity: number;
  unit: string;
  recipeTitles: string[];
};

/** Page d'une liste prête : ses lignes, triées par rayon puis par nom. */
export async function getListPage(id: string) {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("shopping_lists")
    .select(
      "id, owner_id, status, created_at, shopping_list_recipes(recipes(id, title)), shopping_list_items(id, item_id, quantity, unit, included, recipe_ids, items(name, aisles(name, position)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!list) return null;

  const titles = new Map(
    list.shopping_list_recipes
      .map((r) => r.recipes)
      .filter((r): r is { id: string; title: string } => Boolean(r))
      .map((r) => [r.id, r.title]),
  );

  const lines: ListLine[] = list.shopping_list_items
    .filter((l) => l.included)
    .map((l) => ({
      id: l.id,
      itemId: l.item_id,
      name: l.items?.name ?? "",
      aisleName: l.items?.aisles?.name ?? "Divers",
      aislePosition: l.items?.aisles?.position ?? 99,
      quantity: Number(l.quantity),
      unit: l.unit,
      recipeTitles: l.recipe_ids.map((rid) => titles.get(rid)).filter((t): t is string => !!t),
    }))
    .sort((a, b) => a.aislePosition - b.aislePosition || a.name.localeCompare(b.name, "fr"));

  const { userId, names } = await ownerNames(supabase, [list.owner_id]);
  return {
    id: list.id,
    status: list.status as ListStatus,
    createdAt: list.created_at,
    recipeTitles: [...titles.values()],
    lines,
    sharedBy: list.owner_id === userId ? null : (names.get(list.owner_id) ?? "Quelqu'un"),
  };
}
