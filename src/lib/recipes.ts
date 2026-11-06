import { sortByTitle } from "@/lib/recipe-sort";
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
  sharedBy: string | null; // nom de la personne qui me la partage (null : c'est la mienne)
};

/**
 * Nom affiché des personnes qui me partagent des recettes.
 * Les règles d'accès ne laissent lire que le profil des personnes avec qui je partage.
 */
async function getDisplayNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
  return new Map((data ?? []).map((p) => [p.id, p.display_name || "Quelqu'un"]));
}

/** Identifiant de l'utilisateur connecté. */
async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/**
 * Mes recettes, par ordre alphabétique, filtrées par recherche (titre + ingrédients) et
 * par collection.
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
  const userId = await currentUserId(supabase);
  const sharerIds = [...new Set(recipes.map((r) => r.owner_id).filter((id) => id !== userId))];
  const names = await getDisplayNames(supabase, sharerIds);

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

  // Par ordre alphabétique (décision 063), aussi pendant une recherche
  return sortByTitle(recipes).map((r) => ({
    id: r.id,
    title: r.title,
    servings: r.servings,
    isExample: r.is_example,
    sharedBy: r.owner_id === userId ? null : (names.get(r.owner_id) ?? "Quelqu'un"),
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
  const userId = await currentUserId(supabase);
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
  ownerId: string;
  sharedBy: string | null; // nom de la personne qui me la partage (null : c'est la mienne)
  myCopyId: string | null; // recette partagée que j'ai déjà copiée : identifiant de ma copie
  isExample: boolean;
  title: string;
  servings: number;
  steps: string[];
  bookTitle: string | null;
  bookPage: number | null;
  photoPath: string | null;
  thumbPath: string | null;
  photoUrl: string | null;
  importPageUrls: string[]; // pages du livre photographiées à l'import (liens temporaires)
  sourceUrl: string | null; // import par lien : page d'origine
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
      "id, owner_id, title, servings, is_example, steps, book_title, book_page, photo_path, thumb_path, import_photo_paths, source_url, recipe_ingredients(position, item_id, quantity, unit, note, items(name)), recipe_collections(collection_id, collections(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!recipe) return null;

  const userId = await currentUserId(supabase);
  const sharedBy =
    recipe.owner_id === userId
      ? null
      : ((await getDisplayNames(supabase, [recipe.owner_id])).get(recipe.owner_id) ?? "Quelqu'un");
  // Recette partagée : l'ai-je déjà copiée ? (évite les doublons, décision 040)
  const { data: myCopy } =
    sharedBy && userId
      ? await supabase
          .from("recipes")
          .select("id")
          .eq("owner_id", userId)
          .eq("copied_from", recipe.id)
          .limit(1)
          .maybeSingle()
      : { data: null };

  const photoUrl = recipe.photo_path
    ? ((
        await supabase.storage
          .from("recipe-photos")
          .createSignedUrl(recipe.photo_path, SIGNED_URL_SECONDS)
      ).data?.signedUrl ?? null)
    : null;

  // Pages du livre photographiées à l'import : visibles par le propriétaire seulement
  const importPageUrls =
    !sharedBy && recipe.import_photo_paths.length
      ? (
          (
            await supabase.storage
              .from("recipe-photos")
              .createSignedUrls(recipe.import_photo_paths, SIGNED_URL_SECONDS)
          ).data ?? []
        )
          .map((f) => f.signedUrl)
          .filter((url): url is string => Boolean(url))
      : [];

  return {
    id: recipe.id,
    ownerId: recipe.owner_id,
    sharedBy,
    myCopyId: myCopy?.id ?? null,
    isExample: recipe.is_example,
    title: recipe.title,
    servings: recipe.servings,
    steps: recipe.steps,
    bookTitle: recipe.book_title,
    bookPage: recipe.book_page,
    photoPath: recipe.photo_path,
    thumbPath: recipe.thumb_path,
    photoUrl,
    importPageUrls,
    sourceUrl: recipe.source_url,
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
