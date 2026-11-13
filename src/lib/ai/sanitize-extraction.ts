/**
 * Réponse de l'IA nettoyée AVANT d'être vérifiée (correctif du 13/11, import photo).
 *
 * Constat sur la dev : deux imports entiers rejetés pour un seul champ de travers
 * (« reason » de plus de 300 caractères ; une unité hors de la liste, du genre
 * « tasse »). Le contrôle (zod) reste strict, mais on corrige d'abord ce qui peut
 * l'être sans rien inventer :
 * - texte trop long → coupé à la longueur permise ;
 * - unité écrite en toutes lettres (« c. à soupe », « grammes ») → son code ;
 *   unité inconnue (« tasse ») → retirée, recopiée dans la note, ingrédient marqué
 *   « à vérifier » (l'utilisateur corrige) ;
 * - ingrédient sans nom, étape vide → retirés ; listes trop longues → raccourcies ;
 * - nombre impossible (portions à 0, quantité négative) → retiré.
 * Fonction pure, testée. Elle ne touche pas à une réponse déjà correcte.
 */
import { UNITS } from "@/lib/units";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Coupe un texte trop long ; laisse le reste (non-texte) tel quel pour le contrôle. */
function cut(value: unknown, max: number): unknown {
  return typeof value === "string" && value.trim().length > max
    ? value.trim().slice(0, max)
    : value;
}

/** Formes écrites en toutes lettres → code d'unité (minuscules, sans accents ni points). */
const UNIT_ALIASES: Record<string, keyof typeof UNITS> = {
  gramme: "g",
  grammes: "g",
  gr: "g",
  kilo: "kg",
  kilos: "kg",
  kilogramme: "kg",
  kilogrammes: "kg",
  millilitre: "ml",
  millilitres: "ml",
  centilitre: "cl",
  centilitres: "cl",
  litre: "l",
  litres: "l",
  "c a cafe": "cac",
  "cuillere a cafe": "cac",
  "cuilleres a cafe": "cac",
  cc: "cac",
  cuc: "cac",
  "c a the": "cac",
  "cuillere a the": "cac",
  "cuilleres a the": "cac",
  "c a soupe": "cas",
  "cuillere a soupe": "cas",
  "cuilleres a soupe": "cas",
  cs: "cas",
  cas: "cas",
  "c a s": "cas",
  "c a c": "cac",
  pincee: "pincee",
  pincees: "pincee",
  piece: "piece",
  pieces: "piece",
  unite: "piece",
  unites: "piece",
  boite: "boite",
  boites: "boite",
  sachets: "sachet",
  paquets: "paquet",
  pots: "pot",
  bouteilles: "bouteille",
  bottes: "botte",
  tranches: "tranche",
  gousses: "gousse",
  brins: "brin",
  feuilles: "feuille",
};

const simplify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Code d'unité reconnu, ou null. */
export function toUnitCode(value: unknown): keyof typeof UNITS | null {
  if (typeof value !== "string") return null;
  if (value in UNITS) return value as keyof typeof UNITS;
  const simple = simplify(value);
  if (simple in UNITS) return simple as keyof typeof UNITS;
  return UNIT_ALIASES[simple] ?? null;
}

function sanitizeIngredient(raw: unknown): Json | null {
  if (!isObject(raw)) return null;
  const ingredient: Json = { ...raw };
  if (typeof ingredient.name !== "string" || !ingredient.name.trim()) return null;
  ingredient.name = cut(ingredient.name, 80);
  ingredient.item = cut(ingredient.item, 80);
  ingredient.note = cut(ingredient.note, 120);

  if (
    typeof ingredient.quantity === "number" &&
    !(ingredient.quantity > 0 && ingredient.quantity <= 100000)
  ) {
    ingredient.quantity = null;
  }

  // Unité : code connu, forme en toutes lettres, ou retirée et gardée dans la note
  if (ingredient.unit !== null && ingredient.unit !== undefined) {
    const code = toUnitCode(ingredient.unit);
    if (code) {
      ingredient.unit = code;
    } else {
      const written = String(ingredient.unit).trim();
      ingredient.unit = null;
      ingredient.uncertain = true;
      if (written) {
        const note =
          typeof ingredient.note === "string" && ingredient.note.trim()
            ? ingredient.note.trim()
            : "";
        ingredient.note = cut(note ? `${written}, ${note}` : written, 120);
      }
    }
  }

  // Article à créer : unité de cuisine indispensable (pièce par défaut), unité d'achat facultative
  if (isObject(ingredient.new_item)) {
    const newItem: Json = { ...ingredient.new_item };
    newItem.aisle = cut(newItem.aisle, 60);
    newItem.unit = toUnitCode(newItem.unit) ?? "piece";
    newItem.purchase_unit = toUnitCode(newItem.purchase_unit);
    ingredient.new_item = newItem;
  }
  return ingredient;
}

export function sanitizeExtraction(input: unknown): unknown {
  if (!isObject(input)) return input;
  const recipe: Json = { ...input };
  recipe.reason = cut(recipe.reason, 300);
  recipe.title = cut(recipe.title, 120);

  if (
    typeof recipe.servings === "number" &&
    !(Number.isInteger(recipe.servings) && recipe.servings >= 1 && recipe.servings <= 50)
  ) {
    recipe.servings = null;
    recipe.servings_uncertain = true;
  }
  if (
    typeof recipe.book_page === "number" &&
    !(Number.isInteger(recipe.book_page) && recipe.book_page > 0 && recipe.book_page <= 5000)
  ) {
    recipe.book_page = null;
  }
  if (
    typeof recipe.cover_page === "number" &&
    !(Number.isInteger(recipe.cover_page) && recipe.cover_page >= 1 && recipe.cover_page <= 10)
  ) {
    recipe.cover_page = null;
  }

  if (Array.isArray(recipe.ingredients)) {
    recipe.ingredients = recipe.ingredients
      .map(sanitizeIngredient)
      .filter((i): i is Json => i !== null)
      .slice(0, 60);
  }
  if (Array.isArray(recipe.steps)) {
    recipe.steps = recipe.steps
      .filter((step): step is string => typeof step === "string" && step.trim().length > 0)
      .map((step) => cut(step, 2000))
      .slice(0, 40);
  }
  return recipe;
}
