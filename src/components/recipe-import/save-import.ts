import { createItem, discardPhotos, saveRecipe } from "@/app/(app)/recettes/actions";
import {
  canSaveDirectly,
  draftToForm,
  type ImportDraft,
  proposedItemIds,
} from "@/lib/import-draft";
import { urlAfterCreate } from "@/components/recipes/after-create";
import { compressAndUploadPhoto } from "@/lib/photo-upload";
import { formToRecipeInput } from "@/lib/recipe-form";

/** Première lettre en majuscule : « piment d'Espelette » → « Piment d'Espelette ». */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Enregistrement direct d'une recette importée (décision 060), quand rien n'est à
 * vérifier (canSaveDirectly). Même chemin qu'un clic sur « Enregistrer » :
 * 1. les nouveaux articles pré-remplis par l'IA sont créés dans mon catalogue ;
 * 2. le formulaire est vérifié exactement comme à la main (formToRecipeInput) ;
 * 3. la photo du plat (import par lien) est compressée et envoyée ;
 * 4. la recette est enregistrée (saveRecipe), avec sa source (pages ou lien).
 *
 * Renvoie l'adresse de la fiche à ouvrir, ou null : il faut alors montrer le brouillon
 * (doute, ou un des enregistrements a échoué). Rien n'est perdu dans ce cas.
 */
export async function saveImportDirectly(options: {
  draft: ImportDraft;
  recipeId: string;
  userId: string;
  defaultServings: number;
  photoFile: File | null;
  returnToMenu: string | null; // venu d'un menu (US-MEN-01, décision 064)
}): Promise<string | null> {
  const { draft, recipeId, userId, photoFile } = options;
  if (!canSaveDirectly(draft)) return null;

  try {
    const { state } = draftToForm(draft, options.defaultServings);

    // 1. Nouveaux articles : créés avec ce que l'IA a pré-rempli (rayon, unités)
    const ingredients = await Promise.all(
      state.ingredients.map(async (line, index) => {
        const read = draft.ingredients[index];
        if (line.itemId || !read?.newItem) return line;
        const created = await createItem({
          name: capitalize(read.name.trim()),
          aisleId: read.newItem.aisleId,
          defaultUnit: read.newItem.defaultUnit,
          isStaple: read.newItem.purchaseUnit !== null,
          purchaseUnit: read.newItem.purchaseUnit,
        });
        if (!created.ok) throw new Error("article non créé");
        return { ...line, itemId: created.item.id, unit: line.unit || created.item.defaultUnit };
      }),
    );

    // 2. Mêmes vérifications que le formulaire
    const result = formToRecipeInput({ ...state, ingredients });
    if (!result.ok) return null;

    // 3. Photo du plat proposée par le site
    let photoPath: string | null = null;
    let thumbPath: string | null = null;
    if (photoFile) {
      ({ photoPath, thumbPath } = await compressAndUploadPhoto(photoFile, userId, recipeId));
    }

    // 4. La recette
    const saved = await saveRecipe({
      id: recipeId,
      recipe: result.data,
      photoPath,
      thumbPath,
      importId: draft.importId,
    });
    if (!saved.ok) {
      const uploaded = [photoPath, thumbPath].filter((p): p is string => Boolean(p));
      if (uploaded.length) await discardPhotos(uploaded);
      return null;
    }

    // La fiche s'ouvre avec le bandeau « Recette importée » (et les articles proposés),
    // ou le menu d'origine, recette ajoutée
    const params = new URLSearchParams({ importee: "1" });
    const proposed = proposedItemIds(draft);
    if (proposed.length) params.set("proposes", proposed.join(","));
    return await urlAfterCreate(saved.id, options.returnToMenu, `?${params}`);
  } catch {
    return null; // réseau, photo, article : on montre le brouillon, rien n'est perdu
  }
}
