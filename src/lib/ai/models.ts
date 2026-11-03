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
