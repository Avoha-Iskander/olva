/**
 * Appel à Claude pour lire une recette sur une photo (US-REC-02).
 * CÔTÉ SERVEUR UNIQUEMENT : la clé ANTHROPIC_API_KEY ne doit jamais partir dans le
 * navigateur. Ce fichier n'est importé que par des actions serveur.
 */
import Anthropic from "@anthropic-ai/sdk";

import { type AiModel, MODEL_SETTINGS } from "@/lib/ai/models";
import { PROMPT_VERSION, RECIPE_EXTRACTION_PROMPT } from "@/lib/ai/recipe-extraction-prompt";
import { extractRecipeTool, type ExtractedRecipe, parseExtraction } from "@/lib/ai/recipe-schema";

export type ExtractionResult =
  | { status: "done"; recipe: ExtractedRecipe }
  | { status: "not_recipe"; reason: string }
  | { status: "failed"; error: string; retryable: boolean };

import type { ImageMediaType } from "@/lib/image-type";
export type { ImageMediaType };

export { PROMPT_VERSION };

/** Une page photographiée, encodée en base64 pour l'API. */
export type PageImage = { data: string; mediaType: ImageMediaType };

/** Nombre maximal de pages pour une recette (SPEC décision 049). */
export const MAX_PAGES = 3;

/** Contenu d'une demande : des blocs de texte et d'image, dans l'ordre. */
type Content = Anthropic.Messages.ContentBlockParam[];

/**
 * Envoie les pages à Claude, en une seule demande, et renvoie LA recette lue, vérifiée.
 */
export async function extractRecipeFromImages(
  pages: PageImage[],
  model: AiModel,
): Promise<ExtractionResult> {
  if (pages.length < 1 || pages.length > MAX_PAGES) {
    return { status: "failed", error: "Nombre de pages invalide", retryable: false };
  }
  // Les pages dans l'ordre, chacune précédée de son numéro, puis la consigne
  return callExtraction(
    [
      ...pages.flatMap((page, index): Content => [
        { type: "text", text: `Page ${index + 1} :` },
        { type: "image", source: { type: "base64", media_type: page.mediaType, data: page.data } },
      ]),
      {
        type: "text",
        text:
          pages.length === 1
            ? "Lis la recette de cette photo et réponds en appelant l'outil extract_recipe."
            : `Ces ${pages.length} photos sont les pages successives d'une même recette. Lis-la en une seule recette et réponds en appelant l'outil extract_recipe.`,
      },
    ],
    model,
  );
}

/**
 * Import par lien (US-REC-07) : envoie le contenu d'une page web (fiche schema.org ou
 * texte visible) à Claude, qui en tire la recette. Le contenu est encadré par des balises :
 * c'est une DONNÉE à lire, jamais des consignes à suivre (protection contre une page piégée).
 */
export async function extractRecipeFromText(
  pageText: string,
  pageUrl: string,
  model: AiModel,
): Promise<ExtractionResult> {
  // Une page piégée ne doit pas pouvoir « fermer » l'encadré elle-même
  const safeText = pageText.replace(/<\/?page>/gi, "");
  return callExtraction(
    [
      {
        type: "text",
        text: `Contenu de la page web ${pageUrl} :\n<page>\n${safeText}\n</page>\n\nLis la recette de cette page et réponds en appelant l'outil extract_recipe.`,
      },
    ],
    model,
  );
}

/**
 * L'appel commun : réponse par l'outil extract_recipe, puis vérification par zod.
 * « Outil forcé » (tool_choice) quand le modèle l'accepte, sinon « auto » (cf. models.ts).
 */
async function callExtraction(content: Content, model: AiModel): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { status: "failed", error: "Clé API absente", retryable: false };

  // maxRetries : la bibliothèque réessaie seule en cas de surcharge passagère
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  const settings = MODEL_SETTINGS[model];

  try {
    const response = await client.messages.create({
      model,
      max_tokens: settings.maxTokens,
      system: RECIPE_EXTRACTION_PROMPT,
      tools: [extractRecipeTool],
      tool_choice: settings.forcedTool
        ? { type: "tool", name: extractRecipeTool.name }
        : { type: "auto" },
      messages: [{ role: "user", content }],
    });

    const call = response.content.find((block) => block.type === "tool_use");
    if (!call || call.type !== "tool_use") {
      return { status: "failed", error: "Réponse sans recette", retryable: true };
    }

    const parsed = parseExtraction(call.input);
    if (!parsed.ok)
      return { status: "failed", error: `Réponse invalide : ${parsed.error}`, retryable: true };
    if (!parsed.recipe.is_recipe) {
      return { status: "not_recipe", reason: parsed.recipe.reason ?? "Ce n'est pas une recette." };
    }
    return { status: "done", recipe: parsed.recipe };
  } catch (error) {
    // Erreurs de l'API (surcharge, réseau, quota) : on pourra réessayer
    const message =
      error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : String(error);
    return { status: "failed", error: message.slice(0, 300), retryable: true };
  }
}
