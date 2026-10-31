/**
 * Normalise un texte pour comparer sans tenir compte des majuscules ni des accents :
 * « Crème Fraîche » → « creme fraiche », « Œuf » → « oeuf ».
 * Équivalent, côté navigateur, de la fonction SQL private.normalize_text.
 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD") // sépare la lettre de son accent (é → e + ´)
    .replace(/\p{Diacritic}/gu, "") // puis retire les accents
    .replace(/\s+/g, " ")
    .trim();
}
