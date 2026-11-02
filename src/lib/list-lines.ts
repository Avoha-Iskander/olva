/**
 * Lignes d'une liste terminée (US-LST-05) : un même article venant de plusieurs
 * sources (recettes, ingrédient de base, pré-liste, article libre) tient sur UNE
 * ligne, quantités additionnées après conversion. Fonctions pures, testées.
 */
import { roundForList, toDisplayUnit } from "./review";
import { convertQuantity, type ItemConversion } from "./units";

export type LineOrigin = "recipe" | "staple" | "prelist" | "free" | "carryover";

/** Une ligne telle qu'enregistrée pendant la préparation (étapes 2 et 3). */
export type DraftLine = {
  itemId: string;
  origin: LineOrigin;
  quantity: number;
  unit: string;
  included: boolean;
  recipeIds: string[];
};

/** Une ligne de la liste terminée. */
export type FinalLine = {
  itemId: string;
  origin: LineOrigin;
  quantity: number;
  unit: string;
  recipeIds: string[];
};

// Origine retenue quand plusieurs sources se regroupent (la plus « explicable » d'abord)
const ORIGIN_PRIORITY: LineOrigin[] = ["recipe", "staple", "prelist", "free", "carryover"];

/**
 * Regroupe les lignes gardées par article. Dans un groupe, chaque quantité est
 * convertie dans l'unité de la première ligne quand c'est possible ; sinon elle
 * reste sur sa propre ligne (jamais d'addition fausse).
 */
export function consolidateLines(
  lines: DraftLine[],
  conversionsByItem: Map<string, ItemConversion[]> = new Map(),
): FinalLine[] {
  const result: FinalLine[] = [];

  for (const line of lines) {
    if (!line.included) continue; // ligne retirée ou ingrédient de base non coché

    const conversions = conversionsByItem.get(line.itemId) ?? [];
    const target = result.find(
      (r) =>
        r.itemId === line.itemId &&
        convertQuantity(line.quantity, line.unit, r.unit, conversions) !== null,
    );

    if (!target) {
      result.push({
        itemId: line.itemId,
        origin: line.origin,
        quantity: line.quantity,
        unit: line.unit,
        recipeIds: [...line.recipeIds],
      });
      continue;
    }

    target.quantity += convertQuantity(line.quantity, line.unit, target.unit, conversions)!;
    target.recipeIds.push(...line.recipeIds.filter((id) => !target.recipeIds.includes(id)));
    if (ORIGIN_PRIORITY.indexOf(line.origin) < ORIGIN_PRIORITY.indexOf(target.origin)) {
      target.origin = line.origin;
    }
  }

  // Affichage : 1 200 g → 1,2 kg ; pièces arrondies au supérieur
  return result.map((line) => {
    const display = toDisplayUnit(line.quantity, line.unit);
    return { ...line, unit: display.unit, quantity: roundForList(display.quantity, display.unit) };
  });
}

/**
 * Ajout d'un article sur la page de la liste : s'il y est déjà dans une unité
 * compatible, on augmente cette ligne ; sinon on ajoute une ligne.
 * Renvoie l'index de la ligne à augmenter et la quantité à ajouter, ou null.
 */
export function findMergeTarget(
  lines: { itemId: string; unit: string }[],
  itemId: string,
  quantity: number,
  unit: string,
  conversions: ItemConversion[] = [],
): { index: number; added: number } | null {
  const index = lines.findIndex(
    (l) => l.itemId === itemId && convertQuantity(quantity, unit, l.unit, conversions) !== null,
  );
  if (index === -1) return null;
  return { index, added: convertQuantity(quantity, unit, lines[index].unit, conversions)! };
}
