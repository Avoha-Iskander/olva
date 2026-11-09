import type { ImageMediaType } from "@/lib/image-type";
import { quantityToInput } from "@/lib/quantity";
import type { RecipeFormState } from "@/lib/recipe-form";

/**
 * Brouillon de recette issu d'une photo (US-REC-02) et sa conversion en formulaire.
 * Fonctions pures : faciles à tester, aucune dépendance au navigateur ni au serveur.
 */

/** Brouillon renvoyé par le serveur : rien n'est encore enregistré. */
/** Article à créer proposé par l'IA : l'utilisateur n'a qu'à valider. */
export type NewItemSuggestion = {
  aisleId: number;
  defaultUnit: string;
  purchaseUnit: string | null;
};

export type ImportDraft = {
  importId: string;
  photoPaths: string[]; // les pages photographiées, dans l'ordre (vide : import par lien)
  // Import photo : position (à partir de 0) de la photo du plat, sans texte de recette ;
  // elle devient la photo de couverture et ne compte pas parmi les pages (décision 062)
  coverPage: number | null;
  sourceUrl: string | null; // import par lien : adresse de la page
  // Import par lien : photo du plat fournie par le site, proposée comme photo de présentation
  photo: { data: string; mediaType: ImageMediaType } | null;
  title: string;
  titleUncertain: boolean;
  servings: number | null;
  servingsUncertain: boolean;
  steps: string[];
  bookPage: number | null;
  ingredients: {
    name: string; // tel que lu par l'IA
    itemId: string | null; // article du catalogue ; null : non reconnu (surligné)
    proposed: boolean; // article choisi par l'IA sans correspondance évidente
    // Non reconnu : l'article à créer, pré-rempli par l'IA (rayon, unités)
    newItem: NewItemSuggestion | null;
    quantity: number | null;
    unit: string | null;
    note: string | null;
    uncertain: boolean;
  }[];
};

/**
 * Ce qu'on signale sur une ligne d'ingrédient :
 * - uncertain : lecture douteuse (mot ou nombre illisible) → « À vérifier » ;
 * - unrecognized : aucun article → « À vérifier », avec l'article à créer pré-rempli ;
 * - proposed : article choisi par l'IA sans correspondance évidente → simple mention
 *   « proposé », sans rien à faire si c'est le bon.
 */
export type IngredientHighlight = {
  readName: string;
  uncertain: boolean;
  unrecognized: boolean;
  proposed: boolean;
  newItem: NewItemSuggestion | null;
};

/** Ce qu'il faut signaler dans le formulaire. */
export type DraftHighlights = {
  title: boolean;
  servings: boolean;
  /** Par ligne d'ingrédient (clé de ligne) : le nom lu, et pourquoi on le signale. */
  ingredients: Record<string, IngredientHighlight>;
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
    const proposed = !unrecognized && ingredient.proposed;
    if (unrecognized || ingredient.uncertain || proposed) {
      highlights.ingredients[key] = {
        readName: ingredient.name,
        uncertain: ingredient.uncertain,
        unrecognized,
        proposed,
        newItem: unrecognized ? ingredient.newItem : null,
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
      notes: "", // un import laisse les notes vides (US-REC-08)
      bookTitle: "",
      bookPageText: draft.bookPage ? String(draft.bookPage) : "",
      sourceUrl: draft.sourceUrl ?? "", // import par lien : pré-rempli, modifiable
      collectionIds: [],
    },
    highlights,
  };
}

/** Une ligne demande-t-elle une action (et pas seulement une mention « proposé ») ? */
export const needsReview = (h: IngredientHighlight) => h.uncertain || h.unrecognized;

/** Nombre de champs à vérifier : affiché dans le bandeau du brouillon. */
export function countHighlights(highlights: DraftHighlights): number {
  return (
    Number(highlights.title) +
    Number(highlights.servings) +
    Object.values(highlights.ingredients).filter(needsReview).length
  );
}

/**
 * Pages d'un import à rattacher à une recette : seulement si elles sont toutes dans le
 * dossier de cette recette (« <utilisateur>/<recette>/… ») ; sinon null (refusé).
 * La base le vérifie aussi (contrainte sur recipes.import_photo_paths).
 */
export function importPagesForRecipe(
  paths: string[],
  userId: string,
  recipeId: string,
): string[] | null {
  const folder = `${userId}/${recipeId}/`;
  if (paths.length < 1 || paths.length > 3) return null;
  return paths.every((path) => path.startsWith(folder) && !path.includes("..")) ? paths : null;
}

/** Nombre d'articles proposés par l'IA (mention discrète, sans action obligatoire). */
export function countProposed(highlights: DraftHighlights): number {
  return Object.values(highlights.ingredients).filter((h) => h.proposed && !needsReview(h)).length;
}

/** Un synonyme personnel à retenir : « mot lu dans la recette » → article choisi. */
export type LearnedAlias = { alias: string; itemId: string };

/**
 * Ce que j'ai corrigé dans un brouillon importé (US-CAT-05) : pour chaque ligne lue par
 * l'IA dont j'ai changé l'article (ou choisi un article alors qu'il n'y en avait pas),
 * on retient « mot lu → mon article », pour le prochain import.
 * - On compare par clé de ligne (« import-0 »…) : une ligne ajoutée à la main n'a rien
 *   à apprendre ;
 * - le mot lu est mis en minuscules (comme les synonymes communs) ;
 * - un même mot corrigé deux fois : le dernier choix gagne.
 */
export function learnedAliases(
  original: { key: string; itemId: string | null; itemName: string }[],
  current: { key: string; itemId: string | null }[],
): LearnedAlias[] {
  const before = new Map(original.map((line) => [line.key, line]));
  const learned = new Map<string, string>();
  for (const line of current) {
    const read = before.get(line.key);
    if (!read || !line.itemId || line.itemId === read.itemId) continue;
    const alias = read.itemName.trim().toLowerCase().replace(/\s+/g, " ");
    if (alias) learned.set(alias, line.itemId);
  }
  return [...learned].map(([alias, itemId]) => ({ alias, itemId }));
}

/**
 * Décision 060 : une recette importée peut-elle être enregistrée directement, sans
 * passer par le brouillon ? Oui si rien n'est à vérifier :
 * - titre et nombre de personnes lus avec certitude ;
 * - au moins un ingrédient et une étape ;
 * - aucune lecture douteuse, et chaque ingrédient a un article (ou un nouvel article
 *   entièrement pré-rempli par l'IA, que l'app crée elle-même).
 * Les articles « proposés » n'empêchent rien : ils restent signalés sur la fiche.
 */
export function canSaveDirectly(draft: ImportDraft): boolean {
  if (draft.titleUncertain || !draft.title.trim()) return false;
  if (draft.servingsUncertain || draft.servings === null) return false;
  if (!draft.ingredients.length || !draft.steps.length) return false;
  return draft.ingredients.every((i) => !i.uncertain && (i.itemId !== null || i.newItem !== null));
}

/** Articles « proposés » par l'IA dans un brouillon : signalés sur la fiche après l'import. */
export function proposedItemIds(draft: ImportDraft): string[] {
  return [...new Set(draft.ingredients.flatMap((i) => (i.proposed && i.itemId ? [i.itemId] : [])))];
}

/**
 * Les pages d'un import photo, sans la photo de couverture (décision 062) : c'est ce qui
 * est rangé avec la recette comme « pages du livre », et affiché à côté du brouillon.
 */
export function withoutCover<T>(pages: T[], coverPage: number | null): T[] {
  return coverPage === null ? pages : pages.filter((_, index) => index !== coverPage);
}

/**
 * Numéro de couverture donné par l'IA (à partir de 1) → position fiable, ou null :
 * il faut au moins 2 photos (une seule photo de plat n'est pas une recette) et un numéro
 * qui existe.
 */
export function coverIndex(coverPage: number | null | undefined, pageCount: number): number | null {
  if (!coverPage || pageCount < 2 || coverPage > pageCount) return null;
  return coverPage - 1;
}
