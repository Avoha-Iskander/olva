/**
 * Modèles d'IA autorisés pour l'import photo (SPEC §9.2, décision 017).
 * Le modèle de production est choisi par l'administrateur (variable OLVA_AI_MODEL
 * dans Vercel) ; sur les aperçus, on peut le choisir à chaque import pour comparer.
 */
export const AI_MODELS = {
  "claude-haiku-5-5": "Claude Haiku (rapide, économique)",
  "claude-sonnet-5-5": "Claude Sonnet (plus précis)",
} as const;
export type AiModel = keyof typeof AI_MODELS;

export function isAiModel(value: string | undefined | null): value is AiModel {
  return Boolean(value && value in AI_MODELS);
}

/** Modèle par défaut : celui de la variable OLVA_AI_MODEL, sinon Haiku. */
export function defaultAiModel(): AiModel {
  const configured = process.env.OLVA_AI_MODEL;
  return isAiModel(configured) ? configured : "claude-haiku-5-5";
}

/** Le choix du modèle à chaque import n'existe que hors production (aperçus, local). */
export function canChooseAiModel(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

/**
 * Réglages d'appel propres à chaque modèle.
 * - forcedTool : le modèle accepte-t-il qu'on l'OBLIGE à répondre par l'outil
 *   (tool_choice « tool ») ? Sonnet 5.5 le refuse (erreur 400) : on passe alors en
 *   « auto », la consigne lui demande d'appeler l'outil, et zod revérifie la réponse.
 * - maxTokens : Sonnet 5.5 réfléchit avant de répondre, ce qui consomme des jetons.
 */
export const MODEL_SETTINGS: Record<AiModel, { forcedTool: boolean; maxTokens: number }> = {
  "claude-haiku-5-5": { forcedTool: true, maxTokens: 4096 },
  "claude-sonnet-5-5": { forcedTool: false, maxTokens: 16000 },
};

/**
 * Modèles proposés à l'écran pour comparer : aperçus seulement (liste vide en production),
 * le modèle par défaut en premier. À appeler côté serveur (lit les variables d'environnement).
 */
export function selectableModels(): { id: AiModel; label: string }[] {
  if (!canChooseAiModel()) return [];
  const current = defaultAiModel();
  return (Object.keys(AI_MODELS) as AiModel[])
    .map((id) => ({ id, label: AI_MODELS[id] }))
    .sort((a, b) => Number(b.id === current) - Number(a.id === current));
}
