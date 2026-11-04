import {
  computeReview,
  mergeReview,
  type ReviewItem,
  type ReviewLine,
  type SelectedRecipe,
} from "@/lib/review";
import {
  type AisleInfo,
  applyOverride,
  type ItemOverride,
  preferMine,
} from "@/lib/catalogue-overrides";
import { carryoverChoices, type CarryoverChoice } from "@/lib/carryover";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Identifiant de l'utilisateur connecté. */
async function currentUserId(supabase: Supabase) {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/**
 * Personnalisations du catalogue (US-CAT-03) d'une personne pour ces articles,
 * et tous les rayons (nom + ordre). Pour une liste partagée, on lit celles du
 * créateur de la liste : elle est triée selon ses rayons (SPEC §3.1).
 */
async function loadOverrides(supabase: Supabase, userId: string | null, itemIds: string[]) {
  const [{ data: overrides }, { data: aisles }] = await Promise.all([
    userId && itemIds.length
      ? supabase
          .from("item_overrides")
          .select("item_id, aisle_id, is_staple, purchase_unit")
          .eq("user_id", userId)
          .in("item_id", itemIds)
      : Promise.resolve({ data: [] }),
    supabase.from("aisles").select("id, name, position"),
  ]);
  return {
    overrides: new Map<string, ItemOverride>(
      (overrides ?? []).map((o) => [
        o.item_id,
        {
          itemId: o.item_id,
          aisleId: o.aisle_id,
          isStaple: o.is_staple,
          purchaseUnit: o.purchase_unit,
        },
      ]),
    ),
    aisles: new Map<number, AisleInfo>(
      (aisles ?? []).map((a) => [a.id, { name: a.name, position: a.position }]),
    ),
  };
}

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

/** Une carte de l'onglet « Terminées » (US-CRS-03). */
export type FinishedSummary = ListSummary & {
  finishedAt: string | null;
  checkedCount: number; // articles pris
};

/** Historique : mes listes terminées (et celles qu'on me partage), les plus récentes d'abord. */
export async function listFinishedLists(): Promise<FinishedSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shopping_lists")
    .select(
      "id, owner_id, status, created_at, finished_at, shopping_list_recipes(position, recipes(title)), shopping_list_items(included, checked)",
    )
    .eq("status", "done")
    .order("finished_at", { ascending: false, nullsFirst: false })
    .limit(50);
  const { userId, names } = await ownerNames(
    supabase,
    (data ?? []).map((l) => l.owner_id),
  );

  return (data ?? []).map((l) => {
    const kept = l.shopping_list_items.filter((i) => i.included);
    return {
      id: l.id,
      status: "done" as const,
      createdAt: l.created_at,
      finishedAt: l.finished_at,
      recipeTitles: [...l.shopping_list_recipes]
        .sort((a, b) => a.position - b.position)
        .map((r) => r.recipes?.title)
        .filter((t): t is string => Boolean(t)),
      itemCount: kept.length,
      checkedCount: kept.filter((i) => i.checked).length,
      sharedBy: l.owner_id === userId ? null : (names.get(l.owner_id) ?? "Quelqu'un"),
    };
  });
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
          .select(
            "id, name, aisle_id, default_unit, is_staple, purchase_unit, aisles(name, position)",
          )
          .in("id", itemIds),
        supabase
          .from("unit_conversions")
          .select("item_id, owner_id, from_unit, to_unit, factor")
          .in("item_id", itemIds),
      ])
    : [{ data: [] }, { data: [] }];

  // Mes personnalisations (rayon, ingrédient de base) et mes conversions d'abord
  const userId = await currentUserId(supabase);
  const { overrides, aisles } = await loadOverrides(supabase, userId, itemIds);
  const catalogue = new Map<string, ReviewItem>(
    (items ?? []).map((i) => {
      const item = applyOverride(
        {
          id: i.id,
          name: i.name,
          aisleId: i.aisle_id,
          aislePosition: i.aisles?.position ?? 99,
          aisleName: i.aisles?.name,
          defaultUnit: i.default_unit,
          isStaple: i.is_staple,
          purchaseUnit: i.purchase_unit,
          conversions: preferMine(
            (conversions ?? [])
              .filter((c) => c.item_id === i.id)
              .map((c) => ({ ownerId: c.owner_id, from: c })),
            userId,
          ).map(({ from: c }) => ({
            fromUnit: c.from_unit,
            toUnit: c.to_unit,
            factor: Number(c.factor),
          })),
        },
        overrides.get(i.id),
        aisles,
      );
      return [i.id, item];
    }),
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
  aisleName?: string;
  quantity: number;
  unit: string;
};

/** Étape 3 : ma pré-liste (créée par défaut la première fois) et les lignes déjà ajoutées. */
export async function getExtras(listId: string): Promise<{
  prelist: ExtraItem[];
  checked: ExtraItem[]; // articles de la pré-liste cochés pour cette liste
  free: ExtraItem[]; // articles libres ajoutés à cette liste
  carryover: CarryoverChoice[]; // reports de mes dernières courses (gardés ou non)
}> {
  const supabase = await createClient();
  await supabase.rpc("ensure_my_prelist");

  const [{ data: prelist }, { data: lines }, { data: pool }] = await Promise.all([
    supabase
      .from("prelist_items")
      .select("item_id, quantity, unit, position, items(name, aisle_id, aisles(name, position))")
      .order("position"),
    supabase
      .from("shopping_list_items")
      .select(
        "item_id, origin, quantity, unit, included, items(name, aisle_id, aisles(name, position))",
      )
      .eq("list_id", listId)
      .in("origin", ["prelist", "free", "carryover"])
      .order("created_at"),
    supabase
      .from("carryover_items")
      .select("item_id, quantity, unit, items(name, aisle_id, aisles(name, position))")
      .order("created_at"),
  ]);

  // Mes rayons personnalisés s'appliquent aussi au regroupement de l'étape 3
  const itemIds = [
    ...new Set([...(prelist ?? []), ...(lines ?? []), ...(pool ?? [])].map((row) => row.item_id)),
  ];
  const { overrides, aisles } = await loadOverrides(
    supabase,
    await currentUserId(supabase),
    itemIds,
  );

  const toExtra = (row: {
    item_id: string;
    quantity: number;
    unit: string;
    items: {
      name: string;
      aisle_id: number;
      aisles: { name: string; position: number } | null;
    } | null;
  }): ExtraItem => {
    const placed = applyOverride(
      {
        id: row.item_id,
        aisleId: row.items?.aisle_id ?? 0,
        aisleName: row.items?.aisles?.name,
        aislePosition: row.items?.aisles?.position ?? 99,
        isStaple: false,
        purchaseUnit: null,
      },
      overrides.get(row.item_id),
      aisles,
    );
    return {
      itemId: row.item_id,
      name: row.items?.name ?? "",
      aislePosition: placed.aislePosition,
      aisleName: placed.aisleName,
      quantity: Number(row.quantity),
      unit: row.unit,
    };
  };

  return {
    prelist: (prelist ?? []).map(toExtra),
    checked: (lines ?? []).filter((l) => l.origin === "prelist").map(toExtra),
    free: (lines ?? []).filter((l) => l.origin === "free").map(toExtra),
    carryover: carryoverChoices(
      (pool ?? []).map(toExtra),
      (lines ?? [])
        .filter((l) => l.origin === "carryover")
        .map((l) => ({ itemId: l.item_id, unit: l.unit, included: l.included })),
    ),
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
  checked: boolean; // mode courses (lot 6)
  checkedBy: string | null;
  checkedAt: string | null;
};

/** Page d'une liste prête : ses lignes, triées par rayon puis par nom. */
export async function getListPage(id: string) {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("shopping_lists")
    .select(
      "id, owner_id, status, created_at, finished_at, shopping_list_recipes(recipes(id, title)), shopping_list_items(id, item_id, quantity, unit, included, recipe_ids, checked, checked_by, checked_at, items(name, aisle_id, aisles(name, position)))",
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

  // Rayons du CRÉATEUR de la liste (même quand elle m'est partagée)
  const { overrides, aisles } = await loadOverrides(
    supabase,
    list.owner_id,
    list.shopping_list_items.map((l) => l.item_id),
  );

  const lines: ListLine[] = list.shopping_list_items
    .filter((l) => l.included)
    .map((l) => {
      const placed = applyOverride(
        {
          id: l.item_id,
          aisleId: l.items?.aisle_id ?? 0,
          aisleName: l.items?.aisles?.name,
          aislePosition: l.items?.aisles?.position ?? 99,
          isStaple: false,
          purchaseUnit: null,
        },
        overrides.get(l.item_id),
        aisles,
      );
      return {
        id: l.id,
        itemId: l.item_id,
        name: l.items?.name ?? "",
        aisleName: placed.aisleName ?? "Divers",
        aislePosition: placed.aislePosition,
        quantity: Number(l.quantity),
        unit: l.unit,
        recipeTitles: l.recipe_ids.map((rid) => titles.get(rid)).filter((t): t is string => !!t),
        checked: l.checked,
        checkedBy: l.checked_by,
        checkedAt: l.checked_at,
      };
    })
    .sort((a, b) => a.aislePosition - b.aislePosition || a.name.localeCompare(b.name, "fr"));

  const { userId, names } = await ownerNames(supabase, [
    list.owner_id,
    ...list.shopping_list_items.map((l) => l.checked_by).filter((id): id is string => !!id),
  ]);
  return {
    id: list.id,
    userId,
    // Noms affichés des personnes concernées (créateur, personnes qui ont coché)
    names: Object.fromEntries(names),
    status: list.status as ListStatus,
    createdAt: list.created_at,
    finishedAt: list.finished_at,
    recipeTitles: [...titles.values()],
    lines,
    sharedBy: list.owner_id === userId ? null : (names.get(list.owner_id) ?? "Quelqu'un"),
  };
}
