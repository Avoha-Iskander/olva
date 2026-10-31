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
export async function listMyCollections() {
  const supabase = await createClient();
  const { data } = await supabase.from("collections").select("id, name").order("name");
  return data ?? [];
}
