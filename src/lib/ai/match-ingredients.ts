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

/** Minuscules, espaces et ligatures normalisés, mais accents GARDÉS : « Pâté » → « pâté ». */
function lowerKeepAccents(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

/** Le texte contient-il au moins un accent ? */
const hasAccent = (text: string) => normalizeText(text) !== lowerKeepAccents(text);

/** Un nom indexé, avec ses accents (l'index le range sous sa forme sans accents). */
type Entry = { accented: string; itemId: string };

/**
 * Prépare un index nom → article (noms du catalogue et synonymes), puis renvoie une
 * fonction qui retrouve l'article d'un nom lu par l'IA, ou null.
 * Ordre de priorité : mes articles personnels, le catalogue commun, puis les synonymes.
 *
 * Les accents comptent, avec une tolérance (US-CAT-05) :
 * 1. même nom, accents compris (au singulier si besoin) : « Tomates cerises » → Tomate cerise ;
 * 2. même nom tel quel, l'un des deux écrit sans aucun accent : « creme fraiche » → Crème
 *    fraîche (synonyme ou saisie sans accents) ;
 * 3. au singulier, sans accents, seulement si le mot lu n'en a aucun : « echalotes » → Échalote.
 * Ainsi « pâtes » (singulier « pâte ») ne devient plus « Pâté » : les deux mots ont des
 * accents, et ce ne sont pas les mêmes.
 */
export function buildMatcher(
  items: (MatchableItem & { isPersonal?: boolean })[],
  aliases: { alias: string; itemId: string }[] = [],
): (name: string) => string | null {
  // Index : nom sans accents → noms avec accents qui y correspondent, par priorité
  const index = new Map<string, Entry[]>();
  const add = (name: string, itemId: string) => {
    const accented = lowerKeepAccents(name);
    for (const form of new Set([accented, singularize(accented)])) {
      const plain = normalizeText(form);
      const entries = index.get(plain) ?? [];
      if (!entries.some((e) => e.accented === form)) entries.push({ accented: form, itemId });
      index.set(plain, entries);
    }
  };
  // Ordre d'ajout = priorité
  for (const item of items.filter((i) => i.isPersonal)) add(item.name, item.id);
  for (const item of items.filter((i) => !i.isPersonal)) add(item.name, item.id);
  for (const a of aliases) add(a.alias, a.itemId);

  const candidates = (form: string) => index.get(normalizeText(form)) ?? [];

  return (name: string) => {
    const asIs = lowerKeepAccents(name);
    const singular = singularize(asIs);

    // 1. Même nom, accents compris
    for (const form of [asIs, singular]) {
      const exact = candidates(form).find((e) => e.accented === form);
      if (exact) return exact.itemId;
    }
    // 2. Tel quel, quand l'un des deux noms est écrit sans aucun accent (« creme fraiche »)
    const tolerant = candidates(asIs).find((e) => !hasAccent(asIs) || !hasAccent(e.accented));
    if (tolerant) return tolerant.itemId;
    // 3. Au singulier, sans accents : seulement si le mot lu n'en a aucun (« echalotes »)
    if (!hasAccent(asIs)) return candidates(singular)[0]?.itemId ?? null;
    return null;
  };
}

/**
 * Article d'un ingrédient importé → identifiant (US-CAT-05) :
 * 1. mes synonymes d'abord : j'ai déjà corrigé ce mot lors d'un import précédent, mon
 *    choix l'emporte (même sur celui de Claude) ;
 * 2. l'article choisi par Claude : nom exact du catalogue (accents compris, mes articles
 *    d'abord), sinon le rattachement habituel de ce nom ;
 * 3. sinon, le nom lu passe par le rattachement habituel (noms, pluriels, synonymes) ;
 * 4. sinon : non reconnu.
 * `proposed` : Claude n'était pas sûr de la correspondance (affichée « proposé »).
 */
export function resolveItem(
  ingredient: { name: string; item?: string | null; item_proposed?: boolean },
  items: (MatchableItem & { isPersonal?: boolean })[],
  match: (name: string) => string | null,
  mine: (name: string) => string | null = () => null,
): { itemId: string | null; proposed: boolean } {
  const learned = mine(ingredient.name);
  if (learned) return { itemId: learned, proposed: false };

  if (ingredient.item) {
    const wanted = ingredient.item.trim().toLowerCase();
    const exact =
      items.find((i) => i.isPersonal && i.name.toLowerCase() === wanted) ??
      items.find((i) => i.name.toLowerCase() === wanted);
    const found = exact?.id ?? match(ingredient.item);
    if (found) return { itemId: found, proposed: Boolean(ingredient.item_proposed) };
  }
  return { itemId: match(ingredient.name), proposed: false };
}
