import {
  computeReview,
  mergeReview,
  type ReviewItem,
  type ReviewLine,
  type SelectedRecipe,
} from "@/lib/review";
import { createClient } from "@/lib/supabase/server";

export type DraftRecipe = { recipeId: string; servings: number };
export type Draft = { id: string; recipes: DraftRecipe[] };

/**
 * Mon brouillon de liste en cours (le plus récent), ou null.
 * En attendant « Mes listes en cours » (lot 4), « Nouvelle liste » reprend ce brouillon.
 */
export async function getCurrentDraft(): Promise<Draft | null> {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("shopping_lists")
    .select("id, shopping_list_recipes(recipe_id, servings, position)")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!list) return null;

  return {
    id: list.id,
    recipes: [...list.shopping_list_recipes]
      .sort((a, b) => a.position - b.position)
      .map((r) => ({ recipeId: r.recipe_id, servings: r.servings })),
  };
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
