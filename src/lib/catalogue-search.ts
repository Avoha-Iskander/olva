import { normalizeText } from "@/lib/text";

const MAX_RESULTS = 30;

/**
 * Recherche d'articles pour l'auto-complétion, sans tenir compte des accents :
 * d'abord ceux qui commencent par le texte, puis ceux qui le contiennent.
 */
export function searchItems<T extends { name: string }>(items: T[], query: string): T[] {
  const q = normalizeText(query);
  if (!q) return items.slice(0, MAX_RESULTS);
  const starts: T[] = [];
  const contains: T[] = [];
  for (const item of items) {
    const name = normalizeText(item.name);
    if (name.startsWith(q)) starts.push(item);
    else if (name.includes(q)) contains.push(item);
  }
  return [...starts, ...contains].slice(0, MAX_RESULTS);
}
