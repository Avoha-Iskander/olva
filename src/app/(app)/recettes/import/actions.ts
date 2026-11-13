"use server";

import { headers } from "next/headers";
import { z } from "zod";

import {
  type ExtractionResult,
  extractRecipeFromImages,
  extractRecipeFromText,
  MAX_PAGES,
  PROMPT_VERSION,
} from "@/lib/ai/extract-recipe";
import { catalogueForPrompt } from "@/lib/ai/catalogue-prompt";
import { cleanTitle } from "@/lib/ai/clean-title";
import { convertToItemUnit } from "@/lib/ai/convert-to-item-unit";
import { buildMatcher, resolveItem } from "@/lib/ai/match-ingredients";
import { type AiModel, canChooseAiModel, defaultAiModel, isAiModel } from "@/lib/ai/models";
import { detectImageType } from "@/lib/image-type";
import { coverIndex, type ImportDraft } from "@/lib/import-draft";
import { loadMyCatalogue } from "@/lib/my-catalogue";
import { createClient } from "@/lib/supabase/server";
import { hasReadableContent, pageToPromptText, readRecipePage } from "@/lib/url-import/recipe-page";
import { isImageLink } from "@/lib/url-import/image-link";
import { parsePublicUrl, safeFetch } from "@/lib/url-import/safe-fetch";
import { cleanSharedUrl, isInstagram } from "@/lib/url-import/shared-link";

const BUCKET = "recipe-photos";

export type ImportResult =
  | { status: "done"; draft: ImportDraft }
  | { status: "not_recipe"; importId: string; message: string }
  | { status: "failed"; importId: string | null; message: string; retryable: boolean };

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Failure = Extract<ImportResult, { status: "failed" }>;

const failed = (importId: string | null, message: string, retryable: boolean): Failure => ({
  status: "failed",
  importId,
  message,
  retryable,
});

/** Utilisateur connecté et modèle à utiliser (choix possible hors production). */
async function prepare(requestedModel: string | undefined) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? null;
  // Modèle : celui de l'administrateur, ou celui choisi pour comparer (hors production)
  const model: AiModel =
    canChooseAiModel() && isAiModel(requestedModel) ? requestedModel : defaultAiModel();
  return { supabase, userId, model };
}

/**
 * Mon catalogue (articles, synonymes, conversions), chargé AVANT la lecture car Claude
 * choisit les articles dans ce catalogue (US-CAT-05), et sa version pour le prompt.
 */
async function loadCatalogue(supabase: Supabase) {
  const catalogue = await loadMyCatalogue(supabase);
  return {
    ...catalogue,
    prompt: catalogueForPrompt(
      catalogue.items,
      catalogue.aisles.map((a) => a.name),
    ),
  };
}

type Known = Awaited<ReturnType<typeof loadCatalogue>>;

/** Trace de l'import dans recipe_imports : nouvelle, ou reprise pour « Réessayer ». */
async function startImport(
  supabase: Supabase,
  existingId: string | undefined,
  source: { photo_paths: string[] } | { source_url: string } | { pasted_text: true },
  model: AiModel,
): Promise<string | null> {
  if (existingId) {
    await supabase
      .from("recipe_imports")
      .update({ status: "pending", model, error: null })
      .eq("id", existingId);
    return existingId;
  }
  const { data } = await supabase
    .from("recipe_imports")
    .insert({ ...source, model })
    .select("id")
    .single();
  return data?.id ?? null;
}

async function markFailed(supabase: Supabase, importId: string, error: string) {
  await supabase.from("recipe_imports").update({ status: "failed", error }).eq("id", importId);
}

/**
 * Fin commune aux deux imports : on trace le résultat, on rattache les ingrédients à mon
 * catalogue (noms et synonymes, mes articles d'abord) et on renvoie le brouillon.
 * RIEN n'est enregistré comme recette à ce stade.
 */
async function finishImport(
  supabase: Supabase,
  importId: string,
  result: ExtractionResult,
  source: Pick<ImportDraft, "photoPaths" | "sourceUrl" | "photo">,
  messages: { failed: string; unavailable: string; notRecipe: string },
  known: Known,
): Promise<ImportResult> {
  if (result.status === "failed") {
    await markFailed(supabase, importId, result.error);
    return failed(
      importId,
      result.retryable ? messages.failed : messages.unavailable,
      result.retryable,
    );
  }

  if (result.status === "not_recipe") {
    await supabase
      .from("recipe_imports")
      .update({ status: "not_recipe", result: { reason: result.reason, prompt: PROMPT_VERSION } })
      .eq("id", importId);
    return { status: "not_recipe", importId, message: `${messages.notRecipe} : ${result.reason}` };
  }

  const recipe = result.recipe;
  await supabase
    .from("recipe_imports")
    .update({ status: "done", result: { ...recipe, prompt: PROMPT_VERSION } })
    .eq("id", importId);

  const match = buildMatcher(known.items, known.aliases);
  const mine = buildMatcher([], known.myAliases); // mes corrections passées
  const itemUnits = new Map(known.items.map((i) => [i.id, i.defaultUnit]));
  const aisleIds = new Map(known.aisles.map((a) => [a.name.toLowerCase(), a.id]));

  return {
    status: "done",
    draft: {
      importId,
      ...source,
      // Photo du plat parmi les photos envoyées : elle servira de couverture (décision 062)
      coverPage: coverIndex(recipe.cover_page, source.photoPaths.length),
      title: cleanTitle(recipe.title ?? ""),
      titleUncertain: recipe.title_uncertain || !recipe.title,
      servings: recipe.servings ?? null,
      servingsUncertain: recipe.servings_uncertain || !recipe.servings,
      steps: recipe.steps,
      bookPage: recipe.book_page ?? null,
      ingredients: recipe.ingredients.map((i) => {
        // L'article choisi par Claude dans le catalogue, sinon le rattachement par le nom
        const { itemId, proposed } = resolveItem(i, known.items, match, mine);
        const aisleId = i.new_item ? aisleIds.get(i.new_item.aisle.toLowerCase()) : undefined;
        return {
          name: i.name,
          itemId,
          proposed,
          // Article à créer, pré-rempli (seulement si le rayon proposé existe)
          newItem:
            !itemId && i.new_item && aisleId
              ? {
                  aisleId,
                  defaultUnit: i.new_item.unit,
                  purchaseUnit: i.new_item.purchase_unit ?? null,
                }
              : null,
          // Dans l'unité habituelle de l'article quand un poids moyen le permet
          // (« 200 g » de carottes → 2 pièces, « 200 g dans la recette » en note)
          ...(itemId
            ? convertToItemUnit(
                { quantity: i.quantity, unit: i.unit, note: i.note ?? null },
                itemUnits.get(itemId) ?? "",
                known.conversions.get(itemId) ?? [],
              )
            : { quantity: i.quantity, unit: i.unit, note: i.note ?? null }),
          uncertain: i.uncertain,
        };
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Import par photo (US-REC-02)
// ---------------------------------------------------------------------------

const photoInputSchema = z.object({
  photoPaths: z.array(z.string().min(1).max(300)).min(1).max(MAX_PAGES),
  importId: z.uuid().optional(), // « Réessayer » : on reprend le même import
  model: z.string().optional(), // choix du modèle : aperçus seulement
});

/**
 * Import d'une recette par photo (US-REC-02) :
 * 1. les photos (1 à 3 pages, déjà compressées et envoyées par le navigateur) sont lues
 *    dans mon dossier ;
 * 2. elles partent chez Claude en une seule demande, côté serveur ; la réponse est vérifiée ;
 * 3. fin commune : suivi, catalogue, brouillon (finishImport).
 */
export async function importRecipeFromPhoto(
  input: z.infer<typeof photoInputSchema>,
): Promise<ImportResult> {
  const parsed = photoInputSchema.safeParse(input);
  if (!parsed.success) return failed(null, "Photo invalide.", false);

  const { supabase, userId, model } = await prepare(parsed.data.model);
  if (!userId) return failed(null, "Connexion requise.", false);

  const { photoPaths } = parsed.data;
  if (!photoPaths.every((path) => path.startsWith(`${userId}/`))) {
    return failed(null, "Photo invalide.", false);
  }

  const importId = await startImport(
    supabase,
    parsed.data.importId,
    { photo_paths: photoPaths },
    model,
  );
  if (!importId) return failed(null, "L'import n'a pas pu démarrer.", true);

  // Les pages sont téléchargées en parallèle depuis mon dossier
  const downloads = await Promise.all(
    photoPaths.map((path) => supabase.storage.from(BUCKET).download(path)),
  );
  if (downloads.some((d) => d.error || !d.data)) {
    await markFailed(supabase, importId, "Photo introuvable");
    return failed(importId, "La photo est introuvable. Reprenez-la.", false);
  }
  // Le format est lu dans les octets de chaque photo, pas dans son nom (cf. image-type.ts)
  const pages = await Promise.all(
    downloads.map(async (d) => {
      const bytes = Buffer.from(await d.data!.arrayBuffer());
      return { data: bytes.toString("base64"), mediaType: detectImageType(bytes) };
    }),
  );
  if (pages.some((p) => p.mediaType === null)) {
    await markFailed(supabase, importId, "Format d'image non reconnu");
    return failed(importId, "Format de photo non reconnu. Reprenez la photo.", false);
  }

  const known = await loadCatalogue(supabase);
  const result = await extractRecipeFromImages(
    pages.map((p) => ({ data: p.data, mediaType: p.mediaType! })),
    model,
    known.prompt,
  );
  return finishImport(
    supabase,
    importId,
    result,
    { photoPaths, sourceUrl: null, photo: null },
    {
      failed:
        "La lecture de la photo n'a pas abouti. Réessayez, ou saisissez la recette à la main.",
      unavailable:
        "L'import par photo n'est pas disponible pour le moment. Saisissez la recette à la main.",
      notRecipe: "Cette photo ne semble pas contenir de recette",
    },
    known,
  );
}

// ---------------------------------------------------------------------------
// Import par lien (US-REC-07)
// ---------------------------------------------------------------------------

const urlInputSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  importId: z.uuid().optional(),
  model: z.string().optional(),
});

/** Message affiché selon la raison pour laquelle la page n'a pas pu être lue. */
const FETCH_MESSAGES = {
  invalid: "Cette adresse n'est pas valide. Collez le lien complet (https://…).",
  blocked: "Cette adresse ne peut pas être lue.",
  timeout: "Le site met trop de temps à répondre.",
  too_large: "Cette page est trop lourde pour être lue.",
  http: "Ce site ne se laisse pas lire automatiquement.",
  type: "Ce lien ne mène pas à une page web.",
  network: "Le site est injoignable.",
} as const;

/**
 * Import d'une recette depuis un lien (US-REC-07) :
 * 1. le serveur lit la page, avec garde-fous (safe-fetch) ;
 * 2. on en tire la fiche schema.org, sinon le texte visible (recipe-page) ;
 * 3. Claude, en mode texte, remplit le même outil que pour une photo ;
 * 4. la photo du plat fournie par le site est récupérée, pour la proposer ;
 * 5. fin commune : suivi, catalogue, brouillon (finishImport).
 */
export async function importRecipeFromUrl(
  input: z.infer<typeof urlInputSchema>,
): Promise<ImportResult | { status: "exists"; recipeId: string }> {
  const parsed = urlInputSchema.safeParse(input);
  const url = parsed.success ? parsePublicUrl(parsed.data.url) : null;
  if (!parsed.success || !url) return failed(null, FETCH_MESSAGES.invalid, false);

  const { supabase, userId, model } = await prepare(parsed.data.model);
  if (!userId) return failed(null, "Connexion requise.", false);

  // Sans paramètres de suivi (?igsh=…, utm_…) : un même lien partagé deux fois est reconnu
  const sourceUrl = cleanSharedUrl(url.toString()) ?? url.toString();
  // Instagram ne laisse souvent pas lire ses publications : on propose alors le texte
  const instagramHint = isInstagram(sourceUrl)
    ? " Pour Instagram : copiez la légende de la publication, puis utilisez « Coller le texte »."
    : "";

  // Déjà importé (même adresse) : pas de doublon, ni de lecture payante inutile (décision 060)
  const { data: existing } = await supabase
    .from("recipes")
    .select("id")
    .eq("owner_id", userId)
    .eq("source_url", sourceUrl)
    .limit(1)
    .maybeSingle();
  if (existing) return { status: "exists", recipeId: existing.id };

  const importId = await startImport(
    supabase,
    parsed.data.importId,
    { source_url: sourceUrl },
    model,
  );
  if (!importId) return failed(null, "L'import n'a pas pu démarrer.", true);

  const fetched = await safeFetch(sourceUrl, {
    accept: (type) => /text\/html|application\/xhtml/i.test(type),
    maxBytes: 2_000_000,
    timeoutMs: 10_000,
  });
  if (!fetched.ok) {
    // Lien d'une IMAGE au lieu de la page (cas réel : « …/photo.jpg » copié par appui
    // long sur l'image) : on le dit clairement, plutôt qu'un « type de page » obscur
    if (fetched.reason === "type" && isImageLink(sourceUrl, fetched.contentType)) {
      await markFailed(
        supabase,
        importId,
        `Lien d'image (${fetched.contentType || "type inconnu"})`,
      );
      return failed(importId, IMAGE_LINK_MESSAGE, false);
    }
    await markFailed(supabase, importId, `Lecture de la page : ${fetched.reason}`);
    // Délai dépassé ou site injoignable : ça peut passer en réessayant
    const retryable = fetched.reason === "timeout" || fetched.reason === "network";
    return failed(
      importId,
      instagramHint
        ? `${FETCH_MESSAGES[fetched.reason]}${instagramHint}`
        : `${FETCH_MESSAGES[fetched.reason]} ${retryable ? "Réessayez, ou essayez" : "Essayez"} l'import par photo.`,
      retryable,
    );
  }

  // Jeu de caractères annoncé par le site (utf-8 le plus souvent)
  const charset = fetched.contentType.match(/charset=([\w-]+)/i)?.[1] ?? "utf-8";
  let html: string;
  try {
    html = new TextDecoder(charset).decode(fetched.body);
  } catch {
    html = new TextDecoder("utf-8").decode(fetched.body);
  }

  const page = readRecipePage(html, fetched.finalUrl);
  if (!hasReadableContent(page)) {
    await markFailed(supabase, importId, "Page sans contenu lisible");
    return failed(
      importId,
      instagramHint
        ? `Instagram ne laisse pas lire cette publication.${instagramHint}`
        : "Cette page ne contient pas de texte lisible (site qui demande une vérification, page vide…). Essayez l'import par photo.",
      false,
    );
  }

  // La lecture par Claude et le téléchargement de la photo se font en même temps
  const known = await loadCatalogue(supabase);
  const [result, photo] = await Promise.all([
    extractRecipeFromText(pageToPromptText(page), sourceUrl, model, known.prompt),
    page.imageUrl ? fetchDishPhoto(page.imageUrl) : Promise.resolve(null),
  ]);

  return finishImport(
    supabase,
    importId,
    result,
    { photoPaths: [], sourceUrl, photo },
    {
      failed: "La lecture de la page n'a pas abouti. Réessayez, ou essayez l'import par photo.",
      unavailable: "L'import n'est pas disponible pour le moment. Essayez plus tard.",
      // (suivi de « : <raison> » : pas de point final ici)
      notRecipe: instagramHint
        ? "La recette n'apparaît pas dans ce qu'Instagram laisse lire (copiez la légende de la publication, puis « Coller le texte »)"
        : "Cette page ne semble pas contenir de recette",
    },
    known,
  );
}

const textInputSchema = z.object({
  text: z.string().trim().min(40).max(20_000),
  importId: z.uuid().optional(),
  model: z.string().max(60).optional(),
});

/**
 * Import d'un texte collé (décision 065) : la légende d'une publication Instagram, une
 * note, un message… Même lecture qu'une page web, sans lien ni photo du plat.
 */
export async function importRecipeFromText(
  input: z.infer<typeof textInputSchema>,
): Promise<ImportResult> {
  const parsed = textInputSchema.safeParse(input);
  if (!parsed.success) {
    return failed(null, "Collez le texte complet de la recette (ingrédients et étapes).", false);
  }

  const { supabase, userId, model } = await prepare(parsed.data.model);
  if (!userId) return failed(null, "Connexion requise.", false);

  const importId = await startImport(supabase, parsed.data.importId, { pasted_text: true }, model);
  if (!importId) return failed(null, "L'import n'a pas pu démarrer.", true);

  const known = await loadCatalogue(supabase);
  const result = await extractRecipeFromText(parsed.data.text, null, model, known.prompt);

  return finishImport(
    supabase,
    importId,
    result,
    { photoPaths: [], sourceUrl: null, photo: null },
    {
      failed: "La lecture du texte n'a pas abouti. Réessayez.",
      unavailable: "L'import n'est pas disponible pour le moment. Essayez plus tard.",
      notRecipe: "Ce texte ne semble pas contenir de recette",
    },
    known,
  );
}

/**
 * Photo du plat fournie par le site : téléchargée avec les mêmes garde-fous, vérifiée
 * (vraie image JPEG / PNG / WebP), puis renvoyée au navigateur qui la compressera à
 * l'enregistrement, comme une photo prise soi-même. Facultative : null en cas d'échec.
 */
async function fetchDishPhoto(imageUrl: string): Promise<ImportDraft["photo"]> {
  const fetched = await safeFetch(imageUrl, {
    accept: (type) => type.startsWith("image/"),
    maxBytes: 5_000_000,
    timeoutMs: 8_000,
  });
  if (!fetched.ok) return null;
  const mediaType = detectImageType(fetched.body);
  if (!mediaType) return null;
  return { data: Buffer.from(fetched.body).toString("base64"), mediaType };
}

/** Lien d'une image copié à la place de celui de la page (import par lien). */
const IMAGE_LINK_MESSAGE =
  "Vous avez copié le lien de l'image : copiez plutôt l'adresse de la page de la recette, ou utilisez l'import par photo.";

const clientFailureSchema = z.object({ reason: z.string().trim().min(1).max(500) });

/**
 * Trace d'un échec survenu SUR LE TÉLÉPHONE, avant la lecture par Claude : fichier
 * écarté, compression ou envoi impossible. Une ligne « failed » dans recipe_imports,
 * avec la raison et l'appareil (navigateur), pour diagnostiquer sans rien demander.
 * Sans effet visible pour l'utilisateur, et sans conséquence si elle échoue.
 */
export async function recordClientImportFailure(input: z.infer<typeof clientFailureSchema>) {
  const parsed = clientFailureSchema.safeParse(input);
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return;
  const device = (await headers()).get("user-agent")?.slice(0, 200);
  await supabase.from("recipe_imports").insert({
    status: "failed",
    error: `Téléphone — ${parsed.data.reason}${device ? ` · ${device}` : ""}`,
  });
}
