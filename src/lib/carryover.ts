/**
 * Fin des courses (US-CRS-03, décisions 070 et 080) : les articles non cochés peuvent
 * repartir sur une NOUVELLE liste, prête, avec les mêmes partages. Fonction pure, testée.
 */

/** Les articles non cochés, en une ligne : les 3 premiers, puis « et N autres ». */
export function uncheckedSummary(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  const others = names.length - max;
  return `${names.slice(0, max).join(", ")} et ${others} autre${others > 1 ? "s" : ""}`;
}
