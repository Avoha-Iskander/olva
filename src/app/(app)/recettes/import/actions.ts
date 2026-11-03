"use server";

import { z } from "zod";

import {
  extractRecipeFromImage,
  type ImageMediaType,
  PROMPT_VERSION,
} from "@/lib/ai/extract-recipe";
import { buildMatcher } from "@/lib/ai/match-ingredients";
import { canChooseAiModel, defaultAiModel, isAiModel } from "@/lib/ai/models";
import { getCatalogue } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "recipe-photos";

/** Brouillon de recette issu d'une photo : pré-remplit le formulaire, rien n'est enregistré. */
export type ImportDraft = {
  importId: string;
  photoPath: string;
  title: string;
  titleUncertain: boolean;
  servings: number | null;
  servingsUncertain: boolean;
  steps: string[];
  bookPage: number | null;
  ingredients: {
    name: string; // tel que lu par l'IA
    itemId: string | null; // article du catalogue ; null : non reconnu (surligné)
    quantity: number | null;
    unit: string | null;
    note: string | null;
    uncertain: boolean;
  }[];
};

export type ImportResult =
  | { status: "done"; draft: ImportDraft }
  | { status: "not_recipe"; importId: string; message: string }
  | { status: "failed"; importId: string | null; message: string; retryable: boolean };

const inputSchema = z.object({
  photoPath: z.string().min(1).max(300),
  importId: z.uuid().optional(), // « Réessayer » : on reprend le même import
  model: z.string().optional(), // choix du modèle : aperçus seulement
});

function mediaTypeOf(path: string): ImageMediaType {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return "image/webp";
}

/**
 * Import d'une recette par photo (US-REC-02) :
 * 1. la photo (déjà compressée et envoyée par le navigateur) est lue dans mon dossier ;
 * 2. elle part chez Claude, côté serveur ; la réponse est vérifiée ;
 * 3. les ingrédients sont rattachés à mon catalogue ;
 * 4. on renvoie un brouillon : RIEN n'est enregistré comme recette à ce stade.
 * Chaque tentative est tracée dans recipe_imports.
 */
export async function importRecipeFromPhoto(
  input: z.infer<typeof inputSchema>,
): Promise<ImportResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    return { status: "failed", importId: null, message: "Photo invalide.", retryable: false };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { status: "failed", importId: null, message: "Connexion requise.", retryable: false };

  const { photoPath } = parsed.data;
  if (!photoPath.startsWith(`${userId}/`)) {
    return { status: "failed", importId: null, message: "Photo invalide.", retryable: false };
  }

  // Modèle : celui de l'administrateur, ou celui choisi pour comparer (hors production)
  const model =
    canChooseAiModel() && isAiModel(parsed.data.model) ? parsed.data.model : defaultAiModel();

  // Trace de l'import (nouvelle, ou reprise pour « Réessayer »)
  let importId = parsed.data.importId ?? null;
  if (importId) {
    await supabase
      .from("recipe_imports")
      .update({ status: "pending", model, error: null })
      .eq("id", importId);
  } else {
    const { data: created, error } = await supabase
      .from("recipe_imports")
      .insert({ photo_path: photoPath, model })
      .select("id")
      .single();
    if (error || !created) {
      return {
        status: "failed",
        importId: null,
        message: "L'import n'a pas pu démarrer.",
        retryable: true,
      };
    }
    importId = created.id;
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(photoPath);
  if (downloadError || !file) {
    await supabase
      .from("recipe_imports")
      .update({ status: "failed", error: "Photo introuvable" })
      .eq("id", importId);
    return {
      status: "failed",
      importId,
      message: "La photo est introuvable. Reprenez-la.",
      retryable: false,
    };
  }
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const result = await extractRecipeFromImage(base64, mediaTypeOf(photoPath), model);

  if (result.status === "failed") {
    await supabase
      .from("recipe_imports")
      .update({ status: "failed", error: result.error })
      .eq("id", importId);
    return {
      status: "failed",
      importId,
      message: result.retryable
        ? "La lecture de la photo n'a pas abouti. Réessayez, ou saisissez la recette à la main."
        : "L'import par photo n'est pas disponible pour le moment. Saisissez la recette à la main.",
      retryable: result.retryable,
    };
  }

  if (result.status === "not_recipe") {
    await supabase
      .from("recipe_imports")
      .update({ status: "not_recipe", result: { reason: result.reason, prompt: PROMPT_VERSION } })
      .eq("id", importId);
    return {
      status: "not_recipe",
      importId,
      message: `Cette photo ne semble pas contenir de recette : ${result.reason}`,
    };
  }

  const recipe = result.recipe;
  await supabase
    .from("recipe_imports")
    .update({ status: "done", result: { ...recipe, prompt: PROMPT_VERSION } })
    .eq("id", importId);

  // Rattachement au catalogue : noms et synonymes (mes articles d'abord)
  const [catalogue, { data: aliases }] = await Promise.all([
    getCatalogue(),
    supabase.from("item_aliases").select("alias, item_id"),
  ]);
  const match = buildMatcher(
    catalogue.items,
    (aliases ?? []).map((a) => ({ alias: a.alias, itemId: a.item_id })),
  );

  return {
    status: "done",
    draft: {
      importId,
      photoPath,
      title: recipe.title ?? "",
      titleUncertain: recipe.title_uncertain || !recipe.title,
      servings: recipe.servings ?? null,
      servingsUncertain: recipe.servings_uncertain || !recipe.servings,
      steps: recipe.steps,
      bookPage: recipe.book_page ?? null,
      ingredients: recipe.ingredients.map((i) => ({
        name: i.name,
        itemId: match(i.name),
        quantity: i.quantity,
        unit: i.unit,
        note: i.note ?? null,
        uncertain: i.uncertain,
      })),
    },
  };
}
