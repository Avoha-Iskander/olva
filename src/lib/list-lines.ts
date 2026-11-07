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

/** Une ligne déjà dans la liste, telle que lue en base. */
export type ExistingLine = {
  id: string;
  itemId: string;
  quantity: number;
  unit: string;
  included: boolean;
  checked: boolean;
  recipeIds: string[];
};

/** Une ligne à ajouter (ingrédient d'une recette, déjà recalculé pour les portions). */
export type AddedLine = { itemId: string; quantity: number; unit: string; recipeIds: string[] };

/**
 * « Ajouter à la liste » depuis un menu (US-MEN-03) : les ingrédients d'une recette
 * rejoignent une liste déjà prête. Un article déjà présent, pas encore coché et dans une
 * unité compatible voit sa quantité augmenter ; sinon une nouvelle ligne est créée
 * (comme pour un article ajouté à la main sur la page de la liste).
 * Fonction pure : elle dit quoi modifier, l'action serveur l'écrit en base.
 */
export function planAddition(
  existing: ExistingLine[],
  added: AddedLine[],
  conversionsByItem: Map<string, ItemConversion[]> = new Map(),
): {
  updates: { id: string; quantity: number; recipeIds: string[] }[];
  inserts: AddedLine[];
} {
  // Lignes qu'on peut augmenter : gardées et pas encore dans le panier
  const open = existing
    .filter((l) => l.included && !l.checked)
    .map((l) => ({ ...l, recipeIds: [...l.recipeIds] }));
  const touched = new Set<string>();
  const inserts: AddedLine[] = [];

  for (const line of added) {
    const target = findMergeTarget(
      open,
      line.itemId,
      line.quantity,
      line.unit,
      conversionsByItem.get(line.itemId) ?? [],
    );
    if (!target) {
      // Deux lignes du même article dans la recette (unités compatibles) : une seule ligne
      const pending = findMergeTarget(
        inserts,
        line.itemId,
        line.quantity,
        line.unit,
        conversionsByItem.get(line.itemId) ?? [],
      );
      if (pending) inserts[pending.index].quantity += pending.added;
      else inserts.push({ ...line, recipeIds: [...line.recipeIds] });
      continue;
    }
    const row = open[target.index];
    row.quantity += target.added;
    for (const id of line.recipeIds) if (!row.recipeIds.includes(id)) row.recipeIds.push(id);
    touched.add(row.id);
  }

  return {
    updates: open
      .filter((l) => touched.has(l.id))
      .map((l) => ({
        id: l.id,
        quantity: roundForList(l.quantity, l.unit),
        recipeIds: l.recipeIds,
      })),
    inserts: inserts.map((l) => {
      const display = toDisplayUnit(l.quantity, l.unit);
      return {
        ...l,
        unit: display.unit,
        quantity: roundForList(display.quantity, display.unit),
      };
    }),
  };
}
