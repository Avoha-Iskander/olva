"use client";

import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { useFreshSession } from "@/hooks/use-fresh-session";

/**
 * « Nouvelle recette » : formulaire vierge et nouvel identifiant à chaque retour sur
 * l'écran (cf. useFreshSession). L'identifiant sert aussi de dossier pour la photo.
 */
export function NewRecipeForm(
  props: Omit<React.ComponentProps<typeof RecipeForm>, "recipeId" | "initial">,
) {
  const { key, recipeId } = useFreshSession();
  return <RecipeForm key={key} {...props} recipeId={recipeId} initial={null} />;
}
