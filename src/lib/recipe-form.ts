import { parseQuantity } from "@/lib/quantity";
import type { RecipeInput } from "@/lib/validation/recipe";

/**
 * État du formulaire de recette (côté navigateur) et sa conversion vers
 * les données enregistrées. Fonctions pures : faciles à tester.
 */

export type FormIngredient = {
  key: string; // identifiant technique de la ligne (pour React)
  itemId: string | null;
  itemName: string;
  quantityText: string; // tel que saisi : « 1,5 », « 1/2 »…
  unit: string; // "" = pas d'unité (au goût)
  note: string;
};

export type RecipeFormState = {
  title: string;
  servings: number;
  ingredients: FormIngredient[];
  steps: string[];
  bookTitle: string;
  bookPageText: string;
  collectionIds: string[];
};

export type FormErrors = Partial<Record<string, string>>;

/**
 * Convertit l'état du formulaire en données de recette.
 * Les lignes d'ingrédient vides (aucun article choisi) sont ignorées.
 * Renvoie des erreurs lisibles, rattachées au champ concerné.
 */
export function formToRecipeInput(
  state: RecipeFormState,
): { ok: true; data: RecipeInput } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};
  const ingredients: RecipeInput["ingredients"] = [];

  state.ingredients.forEach((line) => {
    const empty = !line.itemId && !line.quantityText.trim() && !line.note.trim();
    if (empty) return;
    if (!line.itemId) {
      errors[`ingredient-${line.key}`] = "Choisissez un article dans la liste";
      return;
    }
    const quantity = parseQuantity(line.quantityText);
    if (quantity === undefined) {
      errors[`ingredient-${line.key}`] = "Quantité invalide (ex. 2 ; 1,5 ; 1/2)";
      return;
    }
    if (quantity !== null && !line.unit) {
      errors[`ingredient-${line.key}`] = "Choisissez une unité";
      return;
    }
    ingredients.push({
      itemId: line.itemId,
      quantity,
      unit: quantity === null ? null : line.unit,
      note: line.note.trim() || undefined,
    });
  });

  let bookPage: number | null = null;
  if (state.bookPageText.trim()) {
    const page = Number(state.bookPageText.trim());
    if (!Number.isInteger(page) || page <= 0) errors.bookPage = "Numéro de page invalide";
    else bookPage = page;
  }

  if (!state.title.trim()) errors.title = "Le titre est obligatoire";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      title: state.title,
      servings: state.servings,
      ingredients,
      steps: state.steps,
      bookTitle: state.bookTitle.trim() || undefined,
      bookPage,
      collectionIds: state.collectionIds,
    },
  };
}
