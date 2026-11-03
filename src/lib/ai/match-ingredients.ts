/**
 * Rattache les ingrédients lus par l'IA aux articles du catalogue (US-REC-02).
 * Prudent : en cas de doute, l'ingrédient reste « non reconnu » (surligné dans le
 * brouillon) plutôt que d'être rattaché au mauvais article.
 */
import { normalizeText } from "@/lib/text";

export type MatchableItem = { id: string; name: string };

/**
 * « Tomates cerises » → « tomate cerise » : met chaque mot au singulier, prudemment.
 * - x final seulement après au / eu / ou (poireaux, choux) : « noix » reste « noix » ;
 * - s final seulement sur les mots de plus de 4 lettres : « gros », « pois » restent.
 */
export function singularize(text: string): string {
  return text
    .split(" ")
    .map((word) => {
      if (/(au|eu|ou)x$/.test(word)) return word.slice(0, -1);
      if (word.length > 4 && /[^s]s$/.test(word)) return word.slice(0, -1);
      return word;
    })
    .join(" ");
}

/** Clés de comparaison d'un nom : tel quel, et au singulier. */
function keys(name: string): string[] {
  const n = normalizeText(name);
  return [...new Set([n, singularize(n)])];
}

/**
 * Prépare un index nom → article (noms du catalogue et synonymes), puis renvoie une
 * fonction qui retrouve l'article d'un nom lu par l'IA, ou null.
 * Mes articles personnels passent avant ceux du catalogue commun.
 */
export function buildMatcher(
  items: (MatchableItem & { isPersonal?: boolean })[],
  aliases: { alias: string; itemId: string }[] = [],
): (name: string) => string | null {
  const index = new Map<string, string>();
  const add = (name: string, itemId: string) => {
    for (const key of keys(name)) if (!index.has(key)) index.set(key, itemId);
  };
  // Ordre d'ajout = priorité : articles perso, puis catalogue commun, puis synonymes
  for (const item of items.filter((i) => i.isPersonal)) add(item.name, item.id);
  for (const item of items.filter((i) => !i.isPersonal)) add(item.name, item.id);
  for (const a of aliases) add(a.alias, a.itemId);

  return (name: string) => {
    for (const key of keys(name)) {
      const found = index.get(key);
      if (found) return found;
    }
    return null;
  };
}
