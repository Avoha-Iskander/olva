/**
 * « Déjà prévu » (US-LST-03, décision 070) : à la pré-liste, signaler un article déjà
 * apporté par les recettes de la liste, pour éviter les doublons (ex. du miel dans une
 * recette ET dans la pré-liste). Fonction pure, testée.
 */
import { formatQuantity } from "@/lib/units";

/** Une ligne de la revue (recette ou ingrédient de base) gardée dans la liste. */
export type PlannedLine = { itemId: string; quantity: number; unit: string; recipeIds: string[] };

/**
 * Pour chaque article prévu, un libellé « 2 c. à s. (Crêpes) » ; plusieurs unités sont
 * jointes (« 200 g + 1 paquet (Crêpes, Gâteau) »).
 */
export function alreadyPlanned(
  lines: PlannedLine[],
  recipeTitles: Record<string, string>,
): Map<string, string> {
  const byItem = new Map<string, { amounts: string[]; recipes: string[] }>();
  for (const line of lines) {
    const entry = byItem.get(line.itemId) ?? { amounts: [], recipes: [] };
    entry.amounts.push(formatQuantity(line.quantity, line.unit));
    for (const id of line.recipeIds) {
      const title = recipeTitles[id];
      if (title && !entry.recipes.includes(title)) entry.recipes.push(title);
    }
    byItem.set(line.itemId, entry);
  }
  return new Map(
    [...byItem].map(([itemId, { amounts, recipes }]) => [
      itemId,
      `${amounts.join(" + ")}${recipes.length ? ` (${recipes.join(", ")})` : ""}`,
    ]),
  );
}
