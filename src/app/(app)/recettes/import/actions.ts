"use server";

import { z } from "zod";

import {
  extractRecipeFromImages,
  type ImageMediaType,
  MAX_PAGES,
  PROMPT_VERSION,
} from "@/lib/ai/extract-recipe";
import { buildMatcher } from "@/lib/ai/match-ingredients";
import { canChooseAiModel, defaultAiModel, isAiModel } from "@/lib/ai/models";
import { getCatalogue } from "@/lib/catalogue";
import type { ImportDraft } from "@/lib/import-draft";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "recipe-photos";

export type ImportResult =
  | { status: "done"; draft: ImportDraft }
  | { status: "not_recipe"; importId: string; message: string }
  | { status: "failed"; importId: string | null; message: string; retryable: boolean };

const inputSchema = z.object({
  photoPaths: z.array(z.string().min(1).max(300)).min(1).max(MAX_PAGES),
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
 * 1. les photos (1 à 3 pages, déjà compressées et envoyées par le navigateur) sont lues
 *    dans mon dossier ;
 * 2. elles partent chez Claude en une seule demande, côté serveur ; la réponse est vérifiée ;
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

  const { photoPaths } = parsed.data;
  if (!photoPaths.every((path) => path.startsWith(`${userId}/`))) {
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
      .insert({ photo_paths: photoPaths, model })
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

  // Les pages sont téléchargées en parallèle depuis mon dossier
  const downloads = await Promise.all(
    photoPaths.map((path) => supabase.storage.from(BUCKET).download(path)),
  );
  if (downloads.some((d) => d.error || !d.data)) {
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
  const pages = await Promise.all(
    downloads.map(async (d, index) => ({
      data: Buffer.from(await d.data!.arrayBuffer()).toString("base64"),
      mediaType: mediaTypeOf(photoPaths[index]),
    })),
  );

  const result = await extractRecipeFromImages(pages, model);

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
      photoPaths,
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
