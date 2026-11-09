import { groupByAisle } from "@/lib/aisles";
import type { ExtraItem } from "@/lib/lists";

/**
 * Étape « Pré-liste » d'une liste (US-LST-03, US-LST-04, décision 074) : la pré-liste et
 * les articles ajoutés ponctuellement sont présentés ensemble, rangés par rayon.
 * Fonction pure, testée.
 *
 * - Dans un rayon : les articles de la pré-liste d'abord (dans leur ordre), puis les ajouts.
 * - Un ajout déjà présent dans la pré-liste n'est pas affiché deux fois (c'est la ligne de
 *   la pré-liste qui compte : voir `isInPrelist`).
 */
export type ExtraRow = { kind: "prelist" | "free"; entry: ExtraItem };

export function groupExtrasByAisle(
  prelist: ExtraItem[],
  free: ExtraItem[],
): { aisle: string; rows: ExtraRow[] }[] {
  const inPrelist = new Set(prelist.map((p) => p.itemId));
  const rows: (ExtraRow & { aisleName?: string; aislePosition: number })[] = [
    ...prelist.map((entry) => ({ kind: "prelist" as const, entry, ...placeOf(entry) })),
    ...free
      .filter((entry) => !inPrelist.has(entry.itemId))
      .map((entry) => ({ kind: "free" as const, entry, ...placeOf(entry) })),
  ];
  return groupByAisle(rows).map(({ aisle, lines }) => ({
    aisle,
    rows: lines.map(({ kind, entry }) => ({ kind, entry })),
  }));
}

const placeOf = (entry: ExtraItem) => ({
  aisleName: entry.aisleName,
  aislePosition: entry.aislePosition,
});

/** Un article ajouté est-il déjà dans la pré-liste ? Alors on le coche au lieu de le doubler. */
export function isInPrelist(prelist: ExtraItem[], itemId: string): boolean {
  return prelist.some((p) => p.itemId === itemId);
}
