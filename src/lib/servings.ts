/**
 * Recalcule la quantité d'un ingrédient quand on change le nombre de personnes.
 *
 * Exemple : une recette pour 4 demande 200 g de farine.
 * Pour 6 personnes → 200 × 6 / 4 = 300 g.
 *
 * C'est une « fonction pure » : même entrée = même sortie, sans rien modifier autour.
 * C'est ce qui la rend facile à tester.
 */
export function scaleQuantity(
  quantity: number,
  baseServings: number,
  targetServings: number,
): number {
  if (baseServings <= 0) {
    throw new Error("Le nombre de personnes de la recette doit être supérieur à 0");
  }
  const scaled = (quantity * targetServings) / baseServings;
  // Arrondi à 2 décimales pour éviter les résultats du type 0.30000000000000004
  return Math.round(scaled * 100) / 100;
}

/**
 * Recalcule toute la liste d'ingrédients d'une recette pour un autre nombre de personnes.
 * Les ingrédients « au goût » (sans quantité) restent tels quels.
 * Le type générique <T> permet de garder tous les autres champs (nom, unité, remarque…).
 */
export function scaleIngredients<T extends { quantity: number | null }>(
  ingredients: T[],
  baseServings: number,
  targetServings: number,
): T[] {
  return ingredients.map((ingredient) =>
    ingredient.quantity === null
      ? ingredient
      : {
          ...ingredient,
          quantity: scaleQuantity(ingredient.quantity, baseServings, targetServings),
        },
  );
}
