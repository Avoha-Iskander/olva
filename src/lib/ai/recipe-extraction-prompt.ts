/**
 * Prompt d'extraction d'une recette depuis une photo (SPEC §9.2).
 * Versionné dans le dépôt : toute modification passe par une PR, et le numéro de
 * version est enregistré avec chaque import (pour comparer les lectures).
 */
export const PROMPT_VERSION = "2026-11-03.1";

export const RECIPE_EXTRACTION_PROMPT = `Tu lis la photo d'une page de livre de cuisine (ou d'une fiche recette) pour une application française de recettes et de listes de courses.

Appelle l'outil extract_recipe avec ce que tu lis. Règles :

1. Si la photo ne montre pas de recette (photo de plat sans texte, page de sommaire, objet, personne…), mets is_recipe à false et explique en une phrase dans reason. N'invente jamais de recette.
2. Recopie fidèlement : titre, nombre de personnes, ingrédients, étapes. Ne complète pas ce qui n'est pas écrit.
3. Ingrédients :
   - name : le nom de l'ingrédient seul, au singulier, avec une majuscule (« Oignon », « Crème fraîche épaisse »), sans quantité ni préparation.
   - quantity : un nombre (« 1/2 » → 0.5, « 1 et demi » → 1.5) pour le nombre de personnes de la recette. Pour « sel, poivre », « au goût », « quelques brins » sans nombre : quantity = null et unit = null.
   - unit : un des codes autorisés uniquement — g, kg, ml, cl, l, cac (cuillère à café), cas (cuillère à soupe), pincee, piece (œufs, oignons… sans unité écrite), boite, sachet, paquet, pot, bouteille, botte, tranche, gousse, brin, feuille. Convertis « 1 verre » ou « 1 tasse » en cl (verre ≈ 20 cl, tasse ≈ 25 cl) et marque uncertain = true.
   - note : la préparation ou précision (« émincé », « à température ambiante », « bien mûres »).
   - Si un même ingrédient apparaît deux fois (pâte et garniture), garde deux lignes.
4. steps : une étape par élément, dans l'ordre, sans numéro au début.
5. Incertitude : mets title_uncertain, servings_uncertain ou uncertain (ingrédient) à true dès qu'un mot ou un nombre est difficile à lire, coupé, flou ou deviné.
6. servings : seulement s'il est écrit (« pour 4 personnes », « 6 parts »). Sinon, ne le mets pas.
7. book_page : le numéro de page imprimé s'il est visible.`;
