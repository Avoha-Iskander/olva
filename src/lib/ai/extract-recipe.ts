/**
 * Appel à Claude pour lire une recette sur une photo (US-REC-02).
 * CÔTÉ SERVEUR UNIQUEMENT : la clé ANTHROPIC_API_KEY ne doit jamais partir dans le
 * navigateur. Ce fichier n'est importé que par des actions serveur.
 */
import Anthropic from "@anthropic-ai/sdk";

import { type AiModel } from "@/lib/ai/models";
import { PROMPT_VERSION, RECIPE_EXTRACTION_PROMPT } from "@/lib/ai/recipe-extraction-prompt";
import { extractRecipeTool, type ExtractedRecipe, parseExtraction } from "@/lib/ai/recipe-schema";

export type ExtractionResult =
  | { status: "done"; recipe: ExtractedRecipe }
  | { status: "not_recipe"; reason: string }
  | { status: "failed"; error: string; retryable: boolean };

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export { PROMPT_VERSION };

/**
 * Envoie la photo à Claude et renvoie la recette lue, vérifiée.
 * « Outil forcé » (tool_choice) : Claude doit répondre en remplissant extract_recipe,
 * ce qui garantit une réponse structurée plutôt qu'un texte libre.
 */
export async function extractRecipeFromImage(
  imageBase64: string,
  mediaType: ImageMediaType,
  model: AiModel,
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { status: "failed", error: "Clé API absente", retryable: false };

  // maxRetries : la bibliothèque réessaie seule en cas de surcharge passagère
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: RECIPE_EXTRACTION_PROMPT,
      tools: [extractRecipeTool],
      tool_choice: { type: "tool", name: extractRecipeTool.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: "Lis la recette de cette photo." },
          ],
        },
      ],
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
