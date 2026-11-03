import { quantityToInput } from "@/lib/quantity";
import type { RecipeFormState } from "@/lib/recipe-form";

/**
 * Brouillon de recette issu d'une photo (US-REC-02) et sa conversion en formulaire.
 * Fonctions pures : faciles à tester, aucune dépendance au navigateur ni au serveur.
 */

/** Brouillon renvoyé par le serveur : rien n'est encore enregistré. */
export type ImportDraft = {
  importId: string;
  photoPaths: string[]; // les pages photographiées, dans l'ordre
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

/** Ce qu'il faut surligner dans le formulaire (« À vérifier »). */
export type DraftHighlights = {
  title: boolean;
  servings: boolean;
  /** Par ligne d'ingrédient (clé de ligne) : le nom lu, et pourquoi on surligne. */
  ingredients: Record<string, { readName: string; uncertain: boolean; unrecognized: boolean }>;
};

/** Aucun surlignage : formulaire de saisie ou de modification habituel. */
export const NO_HIGHLIGHTS: DraftHighlights = { title: false, servings: false, ingredients: {} };

/**
 * Transforme le brouillon en état de formulaire, et liste les champs à vérifier :
 * - titre et nombre de personnes : douteux, ou absents de la page ;
 * - ingrédients : lecture douteuse, ou article introuvable dans mon catalogue.
 * Sans nombre de personnes sur la page, on part de mes portions par défaut.
 */
export function draftToForm(
  draft: ImportDraft,
  defaultServings: number,
): { state: RecipeFormState; highlights: DraftHighlights } {
  const highlights: DraftHighlights = {
    title: draft.titleUncertain || !draft.title.trim(),
    servings: draft.servingsUncertain || draft.servings === null,
    ingredients: {},
  };

  const ingredients = draft.ingredients.map((ingredient, index) => {
    // Clé fixe (et non aléatoire) : identique côté serveur et côté navigateur
    const key = `import-${index}`;
    const unrecognized = ingredient.itemId === null;
    if (unrecognized || ingredient.uncertain) {
      highlights.ingredients[key] = {
        readName: ingredient.name,
        uncertain: ingredient.uncertain,
        unrecognized,
      };
    }
    return {
      key,
      itemId: ingredient.itemId,
      // Le nom lu sert d'étiquette tant qu'aucun article n'est choisi
      itemName: ingredient.name,
      quantityText: quantityToInput(ingredient.quantity),
      unit: ingredient.unit ?? "",
      note: ingredient.note ?? "",
    };
  });

  return {
    state: {
      title: draft.title,
      servings: draft.servings ?? defaultServings,
      ingredients: ingredients.length
        ? ingredients
        : [{ key: "import-0", itemId: null, itemName: "", quantityText: "", unit: "", note: "" }],
      steps: draft.steps.length ? draft.steps : [""],
      bookTitle: "",
      bookPageText: draft.bookPage ? String(draft.bookPage) : "",
      collectionIds: [],
    },
    highlights,
  };
}

/** Nombre de champs à vérifier : affiché dans le bandeau du brouillon. */
export function countHighlights(highlights: DraftHighlights): number {
  return (
    Number(highlights.title) +
    Number(highlights.servings) +
    Object.keys(highlights.ingredients).length
  );
}
