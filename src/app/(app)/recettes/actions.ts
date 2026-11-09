"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { CatalogueItem } from "@/lib/catalogue";
import {
  coverIndex,
  importPagesForRecipe,
  type LearnedAlias,
  withoutCover,
} from "@/lib/import-draft";
import { isExamplePhoto } from "@/lib/example-photos";
import { createClient } from "@/lib/supabase/server";
import { isUnitCode } from "@/lib/units";
import { recipeSchema, type RecipeInput } from "@/lib/validation/recipe";

const BUCKET = "recipe-photos";

/** Identifiant de l'utilisateur connecté (sinon renvoi vers la connexion). */
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/connexion");
  return { supabase, userId };
}

/** Neutralise les caractères spéciaux de ilike (% et _) pour une comparaison exacte. */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Un chemin de photo doit être dans le dossier de l'utilisateur, ou être la photo
 * commune d'une recette d'exemple (gardée telle quelle quand on modifie l'exemple).
 */
function isOwnPath(path: string | null, userId: string, recipeId: string) {
  return path === null || path.startsWith(`${userId}/${recipeId}/`) || isExamplePhoto(path);
}

export type SaveRecipeResult = { ok: true; id: string } | { ok: false; message: string };

/**
 * Enregistre une recette (création ou modification) avec ses ingrédients et
 * ses collections, en un seul bloc (fonction SQL save_recipe).
 * Les photos ont déjà été envoyées par le navigateur ; on reçoit leurs chemins.
 */
/** Synonymes appris : mot en minuscules (comme la contrainte de la table), article valide. */
const learnedAliasesSchema = z
  .array(
    z.object({
      alias: z.string().trim().toLowerCase().min(1).max(80),
      itemId: z.uuid(),
    }),
  )
  .max(50);

export async function saveRecipe(input: {
  id: string;
  recipe: RecipeInput;
  photoPath: string | null;
  thumbPath: string | null;
  importId?: string; // recette issue d'un import (photo ou lien) : on y rattache sa source
  learnedAliases?: LearnedAlias[]; // import : mes corrections d'articles (US-CAT-05)
}): Promise<SaveRecipeResult> {
  const id = z.uuid().safeParse(input.id);
  const parsed = recipeSchema.safeParse(input.recipe);
  if (!id.success || !parsed.success) {
    return { ok: false, message: "Certaines informations sont invalides. Vérifiez le formulaire." };
  }

  const { supabase, userId } = await requireUser();
  if (
    !isOwnPath(input.photoPath, userId, id.data) ||
    !isOwnPath(input.thumbPath, userId, id.data)
  ) {
    return { ok: false, message: "Photo invalide." };
  }

  // Anciennes photos, pour les supprimer si elles ont été remplacées
  const { data: previous } = await supabase
    .from("recipes")
    .select("photo_path, thumb_path")
    .eq("id", id.data)
    .maybeSingle();

  const r = parsed.data;
  const { error } = await supabase.rpc("save_recipe", {
    recipe: {
      id: id.data,
      title: r.title,
      servings: r.servings,
      steps: r.steps,
      book_title: r.bookTitle ?? null,
      book_page: r.bookPage ?? null,
      photo_path: input.photoPath,
      thumb_path: input.thumbPath,
      ingredients: r.ingredients.map((i) => ({
        item_id: i.itemId,
        quantity: i.quantity,
        unit: i.unit,
        note: i.note ?? null,
      })),
      collection_ids: r.collectionIds,
    },
  });
  if (error) return { ok: false, message: "L'enregistrement a échoué. Réessayez." };

  // Lien de la page d'origine (pré-rempli lors d'un import par lien) et notes (US-REC-08)
  await supabase
    .from("recipes")
    .update({ source_url: r.sourceUrl ?? null, notes: r.notes ?? null })
    .eq("id", id.data);

  // Import photo : les pages photographiées restent attachées à la recette (US-REC-02).
  // Elles sont reprises de l'import lui-même, jamais du navigateur.
  // Échec sans gravité : la recette est enregistrée, seules les pages manqueront.
  if (input.importId && z.uuid().safeParse(input.importId).success) {
    const { data: imported } = await supabase
      .from("recipe_imports")
      .select("photo_paths, result")
      .eq("id", input.importId)
      .maybeSingle();
    // La photo du plat (couverture, décision 062) n'est pas une page du livre
    const paths = imported?.photo_paths ?? [];
    const result = imported?.result as { cover_page?: number | null } | null;
    const pages = importPagesForRecipe(
      withoutCover(paths, coverIndex(result?.cover_page, paths.length)),
      userId,
      id.data,
    );
    if (pages) {
      await supabase.from("recipes").update({ import_photo_paths: pages }).eq("id", id.data);
    }
  }

  // Mes corrections d'articles deviennent mes synonymes : au prochain import, le même mot
  // lu ira directement vers l'article que j'ai choisi. Échec sans gravité (recette enregistrée).
  const aliases = learnedAliasesSchema.safeParse(input.learnedAliases ?? []);
  if (aliases.success && aliases.data.length) {
    await supabase.from("my_item_aliases").upsert(
      aliases.data.map((a) => ({ owner_id: userId, alias: a.alias, item_id: a.itemId })),
      { onConflict: "owner_id,alias" }, // déjà appris : le nouveau choix remplace l'ancien
    );
  }

  // Les photos communes des exemples ne se suppriment jamais
  const obsolete = [previous?.photo_path, previous?.thumb_path].filter(
    (p): p is string =>
      Boolean(p) && !isExamplePhoto(p) && p !== input.photoPath && p !== input.thumbPath,
  );
  if (obsolete.length) await supabase.storage.from(BUCKET).remove(obsolete);

  revalidatePath("/recettes");
  return { ok: true, id: id.data };
}

/** Supprime une de mes recettes et ses photos (fichiers d'abord, puis la ligne en base). */
async function removeRecipe(recipeId: string) {
  const id = z.uuid().parse(recipeId);
  const { supabase, userId } = await requireUser();

  const { data: files } = await supabase.storage.from(BUCKET).list(`${userId}/${id}`);
  if (files?.length) {
    await supabase.storage.from(BUCKET).remove(files.map((f) => `${userId}/${id}/${f.name}`));
  }
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  revalidatePath("/recettes");
  return !error;
}

/** Suppression depuis le formulaire de modification : retour à la liste. */
export async function deleteRecipe(recipeId: string) {
  await removeRecipe(recipeId);
  redirect("/recettes");
}

/** Suppression depuis la liste (menu ⋯ ou glissement) : on reste sur la liste. */
export async function deleteRecipeFromList(recipeId: string): Promise<{ ok: boolean }> {
  return { ok: await removeRecipe(recipeId) };
}

/**
 * « Supprimer les exemples » : efface d'un coup mes recettes d'exemple.
 * Les exemples n'ont pas de photo (un exemple modifié n'est plus un exemple),
 * il n'y a donc rien à nettoyer dans l'espace de stockage.
 */
export async function deleteExamples(): Promise<{ ok: boolean }> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("owner_id", userId)
    .eq("is_example", true);
  revalidatePath("/recettes");
  return { ok: !error };
}

/**
 * Supprime des photos envoyées pour rien (l'enregistrement de la recette a échoué).
 * Seuls des fichiers de mon propre dossier peuvent être supprimés.
 */
export async function discardPhotos(paths: string[]) {
  const { supabase, userId } = await requireUser();
  const own = paths.filter((p) => p.startsWith(`${userId}/`));
  if (own.length) await supabase.storage.from(BUCKET).remove(own);
}

const newItemSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est obligatoire").max(80, "80 caractères maximum"),
    aisleId: z.number().int().positive("Choisissez un rayon"),
    defaultUnit: z.string().refine(isUnitCode, "Choisissez une unité"),
    isStaple: z.boolean(),
    purchaseUnit: z.string().refine(isUnitCode).nullable(),
  })
  .refine((i) => !i.isStaple || i.purchaseUnit !== null, {
    message: "Indiquez comment il s'achète (bouteille, paquet…)",
    path: ["purchaseUnit"],
  });

export type CreateItemResult =
  { ok: true; item: CatalogueItem } | { ok: false; errors: Partial<Record<string, string>> };

/**
 * Ajoute un article à MON catalogue (US-CAT-02).
 * S'il existe déjà (même nom), on renvoie l'existant plutôt qu'une erreur.
 */
export async function createItem(input: z.input<typeof newItemSchema>): Promise<CreateItemResult> {
  const parsed = newItemSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { ok: false, errors };
  }
  const { supabase, userId } = await requireUser();
  const i = parsed.data;

  const columns = "id, name, aisle_id, default_unit, is_staple, purchase_unit, owner_id";
  const { data, error } = await supabase
    .from("items")
    .insert({
      owner_id: userId,
      name: i.name,
      aisle_id: i.aisleId,
      default_unit: i.defaultUnit,
      is_staple: i.isStaple,
      purchase_unit: i.isStaple ? i.purchaseUnit : null,
    })
    .select(columns)
    .single();

  let row = data;
  if (error?.code === "23505") {
    // Déjà dans mon catalogue ou dans le catalogue commun : on le reprend
    const { data: existing } = await supabase
      .from("items")
      .select(columns)
      .ilike("name", escapeLike(i.name))
      .limit(1)
      .maybeSingle();
    row = existing;
  }
  if (!row) return { ok: false, errors: { name: "L'article n'a pas pu être créé. Réessayez." } };

  return {
    ok: true,
    item: {
      id: row.id,
      name: row.name,
      aisleId: row.aisle_id,
      defaultUnit: row.default_unit,
      isStaple: row.is_staple,
      purchaseUnit: row.purchase_unit,
      isPersonal: row.owner_id !== null,
    },
  };
}

export type CreateCollectionResult =
  { ok: true; collection: { id: string; name: string } } | { ok: false; message: string };

/** Crée une collection (ou renvoie celle qui porte déjà ce nom). */
export async function createCollection(name: string): Promise<CreateCollectionResult> {
  const parsed = z.string().trim().min(1).max(60).safeParse(name);
  if (!parsed.success)
    return { ok: false, message: "Nom de collection invalide (1 à 60 caractères)" };
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("collections")
    .insert({ name: parsed.data })
    .select("id, name")
    .single();
  if (data) return { ok: true, collection: data };

  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("collections")
      .select("id, name")
      .ilike("name", escapeLike(parsed.data))
      .maybeSingle();
    if (existing) return { ok: true, collection: existing };
  }
  return { ok: false, message: "La collection n'a pas pu être créée." };
}

/**
 * « Copier dans mes recettes » : copie indépendante d'une recette qu'on me partage
 * (fonction SQL copy_recipe), puis copie de sa photo dans mon dossier.
 * Renvoie l'identifiant de ma copie (la copie existante si je l'avais déjà copiée).
 */
export async function copyRecipe(
  sourceId: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const source = z.uuid().safeParse(sourceId);
  if (!source.success) return { ok: false, message: "Recette introuvable." };
  const { supabase, userId } = await requireUser();

  const { data: copyId, error } = await supabase.rpc("copy_recipe", { source: source.data });
  if (error || !copyId) return { ok: false, message: "La copie a échoué. Réessayez." };

  // Photo : copiée dans MON dossier, pour que ma copie ne dépende pas de l'original
  const [{ data: original }, { data: copy }] = await Promise.all([
    supabase.from("recipes").select("photo_path, thumb_path").eq("id", source.data).maybeSingle(),
    supabase.from("recipes").select("photo_path").eq("id", copyId).maybeSingle(),
  ]);
  if (isExamplePhoto(original?.photo_path) && !copy?.photo_path) {
    // Photo commune d'un exemple : rien à recopier, la copie pointe vers le même fichier
    await supabase
      .from("recipes")
      .update({ photo_path: original.photo_path, thumb_path: original.thumb_path })
      .eq("id", copyId);
  } else if (original?.photo_path && !copy?.photo_path) {
    const copyFile = async (path: string | null) => {
      if (!path) return null;
      const target = `${userId}/${copyId}/${path.split("/").pop()}`;
      const { error: copyError } = await supabase.storage.from(BUCKET).copy(path, target);
      return copyError ? null : target;
    };
    const [photoPath, thumbPath] = await Promise.all([
      copyFile(original.photo_path),
      copyFile(original.thumb_path),
    ]);
    // Si la copie de la photo échoue, la recette reste copiée, simplement sans photo
    if (photoPath) {
      await supabase
        .from("recipes")
        .update({ photo_path: photoPath, thumb_path: thumbPath })
        .eq("id", copyId);
    }
  }

  revalidatePath("/recettes");
  return { ok: true, id: copyId };
}
