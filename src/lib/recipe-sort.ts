/**
 * Tri des recettes par titre, à la française (décision 063) : majuscules et accents ne
 * comptent pas (« Éclair » avec les E, « Œufs » avec les O), et les nombres sont lus comme
 * des nombres (« 2 tartes » avant « 10 tartes »). Fonction pure.
 */
const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

export function sortByTitle<T extends { title: string }>(recipes: T[]): T[] {
  return [...recipes].sort((a, b) => collator.compare(a.title.trim(), b.title.trim()));
}
