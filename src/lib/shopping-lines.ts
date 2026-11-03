import { groupByAisle } from "@/lib/aisles";

/**
 * Mode courses (US-CRS-01, US-CRS-02) : les lignes à cocher et leur mise à jour.
 * Fonctions pures, sans réseau ni React : testées avec Vitest.
 */

/** Une ligne de l'écran de courses. */
export type ShoppingLine = {
  id: string;
  itemId: string;
  name: string;
  aisleName: string;
  aislePosition: number;
  quantity: number;
  unit: string;
  recipeTitles: string[];
  checked: boolean;
  checkedBy: string | null; // identifiant de la personne qui a coché
  checkedAt: string | null;
};

/**
 * Lignes groupées par rayon (ordre du magasin). Dans un rayon : d'abord ce qui reste
 * à prendre (par nom), puis ce qui est coché (dans l'ordre où ça a été coché).
 */
export function shoppingGroups(lines: ShoppingLine[]) {
  return groupByAisle(lines).map(({ aisle, lines }) => {
    const todo = lines.filter((l) => !l.checked).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const done = lines
      .filter((l) => l.checked)
      .sort((a, b) => (a.checkedAt ?? "").localeCompare(b.checkedAt ?? ""));
    return { aisle, lines: [...todo, ...done], remaining: todo.length };
  });
}

/** Progression affichée en haut : « 12 / 30 ». */
export function progress(lines: ShoppingLine[]): { checked: number; total: number } {
  return { checked: lines.filter((l) => l.checked).length, total: lines.length };
}

/** Cocher / décocher une ligne à l'écran, avant même la réponse du serveur. */
export function setChecked(
  lines: ShoppingLine[],
  lineId: string,
  checked: boolean,
  userId: string | null,
): ShoppingLine[] {
  return lines.map((l) =>
    l.id !== lineId || l.checked === checked
      ? l
      : {
          ...l,
          checked,
          checkedBy: checked ? userId : null,
          checkedAt: checked ? new Date().toISOString() : null,
        },
  );
}

/** Une ligne telle qu'envoyée par le temps réel (colonnes de shopping_list_items). */
export type LineRow = {
  id: string;
  item_id: string;
  quantity: number | string;
  unit: string;
  included: boolean;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
};

/** Un changement reçu en temps réel. */
export type LineChange =
  | { eventType: "INSERT"; new: LineRow }
  | { eventType: "UPDATE"; new: LineRow }
  | { eventType: "DELETE"; old: { id: string } };

/**
 * Applique un changement reçu d'un autre téléphone (ou le retour de mes propres actions).
 * - modification : coche, quantité, unité ; une ligne retirée (included = false) disparaît ;
 * - suppression : la ligne disparaît ;
 * - ajout, ou modification d'une ligne inconnue : il manque son nom et son rayon,
 *   on demande donc de recharger la liste (needsReload).
 */
export function applyChange(
  lines: ShoppingLine[],
  change: LineChange,
): { lines: ShoppingLine[]; needsReload: boolean } {
  if (change.eventType === "DELETE") {
    return { lines: lines.filter((l) => l.id !== change.old.id), needsReload: false };
  }
  const row = change.new;
  const known = lines.find((l) => l.id === row.id);
  if (!known) return { lines, needsReload: row.included };
  if (!row.included) return { lines: lines.filter((l) => l.id !== row.id), needsReload: false };
  return {
    lines: lines.map((l) =>
      l.id === row.id
        ? {
            ...l,
            quantity: Number(row.quantity),
            unit: row.unit,
            checked: row.checked,
            checkedBy: row.checked_by,
            checkedAt: row.checked_at,
          }
        : l,
    ),
    needsReload: false,
  };
}
