import { createClient } from "@/lib/supabase/server";

/** Durée de validité des liens vers les photos privées (1 heure). */
const SIGNED_URL_SECONDS = 60 * 60;

export type RecipeSummary = {
  id: string;
  title: string;
  servings: number;
  thumbUrl: string | null;
  collections: { id: string; name: string }[];
  isExample: boolean;
};

/**
 * Mes recettes, filtrées par recherche (titre + ingrédients) et par collection.
 * La recherche est faite par la fonction SQL search_my_recipes (insensible aux accents).
 */
export async function listMyRecipes({
  search,
  collectionId,
}: {
  search?: string;
  collectionId?: string;
}): Promise<RecipeSummary[]> {
  const supabase = await createClient();

  const { data: recipes, error } = await supabase.rpc("search_my_recipes", {
    search: search || undefined,
    collection: collectionId || undefined,
  });
  if (error) throw new Error(`Lecture des recettes impossible : ${error.message}`);
  if (!recipes?.length) return [];

  const ids = recipes.map((r) => r.id);

  // Collections de chaque recette (une seule requête pour toutes)
  const { data: links } = await supabase
    .from("recipe_collections")
    .select("recipe_id, collections(id, name)")
    .in("recipe_id", ids);

  // Liens temporaires vers les miniatures (photos privées)
  const thumbPaths = recipes.map((r) => r.thumb_path).filter((p): p is string => Boolean(p));
  const signed = thumbPaths.length
    ? (
        await supabase.storage
          .from("recipe-photos")
          .createSignedUrls(thumbPaths, SIGNED_URL_SECONDS)
      ).data
    : [];
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return recipes.map((r) => ({
    id: r.id,
    title: r.title,
    servings: r.servings,
    isExample: r.is_example,
    thumbUrl: r.thumb_path ? (urlByPath.get(r.thumb_path) ?? null) : null,
    collections: (links ?? [])
      .filter((l) => l.recipe_id === r.id && l.collections)
      .map((l) => ({ id: l.collections!.id, name: l.collections!.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
  }));
}

/** Mes collections, par ordre alphabétique. */
/** Ai-je encore des recettes d'exemple ? (affiche le bandeau « Supprimer les exemples ») */
export async function hasExamples(): Promise<boolean> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return false;
  // Filtre sur owner_id : au lot 2.7, je verrai aussi les recettes qu'on me partage
  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true }) // head : on ne veut que le nombre
    .eq("owner_id", userId)
    .eq("is_example", true);
  return (count ?? 0) > 0;
}

export async function listMyCollections() {
  const supabase = await createClient();
  const { data } = await supabase.from("collections").select("id, name").order("name");
  return data ?? [];
}

export type RecipeForEdit = {
  id: string;
  isExample: boolean;
  title: string;
  servings: number;
  steps: string[];
  bookTitle: string | null;
  bookPage: number | null;
  photoPath: string | null;
  thumbPath: string | null;
  photoUrl: string | null;
  collectionIds: string[];
  collections: { id: string; name: string }[]; // pour l'affichage sur la fiche
  ingredients: {
    itemId: string;
    itemName: string;
    quantity: number | null;
    unit: string | null;
    note: string | null;
  }[];
};

/** Une de mes recettes, complète, pour l'afficher ou la modifier (null si introuvable). */
export async function getRecipeForEdit(id: string): Promise<RecipeForEdit | null> {
  const supabase = await createClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "id, title, servings, is_example, steps, book_title, book_page, photo_path, thumb_path, recipe_ingredients(position, item_id, quantity, unit, note, items(name)), recipe_collections(collection_id, collections(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!recipe) return null;

  const photoUrl = recipe.photo_path
    ? ((
        await supabase.storage
          .from("recipe-photos")
          .createSignedUrl(recipe.photo_path, SIGNED_URL_SECONDS)
      ).data?.signedUrl ?? null)
    : null;

  return {
    id: recipe.id,
    isExample: recipe.is_example,
    title: recipe.title,
    servings: recipe.servings,
    steps: recipe.steps,
    bookTitle: recipe.book_title,
    bookPage: recipe.book_page,
    photoPath: recipe.photo_path,
    thumbPath: recipe.thumb_path,
    photoUrl,
    collectionIds: recipe.recipe_collections.map((c) => c.collection_id),
    collections: recipe.recipe_collections
      .map((c) => ({ id: c.collection_id, name: c.collections?.name ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    ingredients: [...recipe.recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        itemId: i.item_id,
        itemName: i.items?.name ?? "",
        quantity: i.quantity,
        unit: i.unit,
        note: i.note,
      })),
  };
}
