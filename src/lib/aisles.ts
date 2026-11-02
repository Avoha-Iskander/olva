/**
 * Regroupe des lignes par rayon, dans l'ordre du parcours en magasin
 * (fruits et légumes d'abord…). Dans un rayon, l'ordre d'arrivée est conservé.
 * Fonction pure, utilisée par la revue, l'étape 3 et la page de la liste.
 */
export function groupByAisle<T extends { aisleName?: string; aislePosition: number }>(
  lines: T[],
): { aisle: string; lines: T[] }[] {
  const groups = new Map<string, { aisle: string; position: number; lines: T[] }>();
  for (const line of lines) {
    const aisle = line.aisleName || "Divers";
    const group = groups.get(aisle) ?? { aisle, position: line.aislePosition, lines: [] };
    group.lines.push(line);
    groups.set(aisle, group);
  }
  // sort ne change pas l'ordre des rayons à égalité (tri « stable »)
  return [...groups.values()]
    .sort((a, b) => a.position - b.position)
    .map(({ aisle, lines }) => ({ aisle, lines }));
}
