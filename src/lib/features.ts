import { createClient } from "@/lib/supabase/server";

/**
 * Fonctionnalités réservées à certains comptes (« feature flags », décision 082).
 * Activer pour quelqu'un : une ligne dans la table feature_flags (par migration en prod).
 * Ajouter une fonctionnalité : son code ici, puis `hasFeature(...)` là où elle s'affiche.
 */
export const FEATURES = {
  printShoppingList: "print_shopping_list", // bouton « Imprimer la liste » en mode courses
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

/** La personne connectée a-t-elle cette fonctionnalité ? (non, en cas de doute) */
export async function hasFeature(feature: Feature): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("feature")
    .eq("feature", feature)
    .maybeSingle();
  return !error && data !== null;
}
