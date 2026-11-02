/**
 * Revue des ingrédients (étape 2 de « Nouvelle liste ») — US-LST-02 et US-LST-05.
 *
 * Que des « fonctions pures » : elles reçoivent des données et renvoient un résultat,
 * sans lire la base ni toucher à l'écran. C'est ce qui permet de les tester en détail.
 *
 * Le chemin des données :
 *   recettes choisies + portions ──computeReview──▶ lignes calculées
 *   lignes calculées + revue précédente ──mergeReview──▶ revue affichée
 *   (mergeReview garde mes ajustements quand je reviens changer les recettes)
 */
import {
  convertQuantity,
  formatQuantity,
  type ItemConversion,
  isUnitCode,
  roundQuantity,
  UNITS,
} from "./units";

/** Article du catalogue, avec ce qu'il faut pour le calcul. */
export type ReviewItem = {
  id: string;
  name: string;
  aislePosition: number; // ordre du rayon dans le magasin
  defaultUnit: string;
  isStaple: boolean; // ingrédient de base (huile, sel…)
  purchaseUnit: string | null; // unité de conditionnement (bouteille, paquet…)
  conversions: ItemConversion[]; // conversions propres à l'article
};

/** Une recette choisie à l'étape 1, avec ses portions. */
export type SelectedRecipe = {
  recipeId: string;
  baseServings: number; // personnes prévues par la recette
  servings: number; // personnes choisies pour cette liste
  ingredients: { itemId: string; quantity: number | null; unit: string | null }[];
};

/** Ligne calculée à partir des recettes (avant mes ajustements). */
export type ComputedLine = {
  key: string; // identifiant stable de la ligne : article + unité (ou « base »)
  itemId: string;
  name: string;
  aislePosition: number;
  section: "main" | "staple"; // « staple » : ingrédients de base, en bas
  quantity: number;
  unit: string;
  includedByDefault: boolean; // les ingrédients de base sont décochés par défaut
  recipeIds: string[]; // recettes d'où vient la ligne
  // Ingrédients de base : quantité réellement demandée par les recettes (affichée
  // entre parenthèses pour aider à décider : « Sucre (100 g) — 1 paquet »)
  requested?: { quantity: number; unit: string }[];
  requestedToTaste?: boolean; // au moins une recette l'indique « au goût »
};

/** Ligne de la revue, telle qu'affichée et enregistrée. */
export type ReviewLine = ComputedLine & {
  computedQuantity: number; // quantité calculée, dans l'unité de la clé (repère les changements)
  included: boolean; // ligne gardée (ou cochée, pour un ingrédient de base)
  adjusted: boolean; // j'ai changé la quantité à la main
  changed: boolean; // la quantité calculée a changé depuis la dernière revue
};

/** Une unité de comptage (pièce, boîte…) ne se fractionne pas en magasin. */
function isCountUnit(unit: string) {
  return isUnitCode(unit) && UNITS[unit].kind === "count";
}

/**
 * Arrondi « liste de courses » (décision 037) : pièces, boîtes… au supérieur
 * (1,5 œuf → 2), le reste à 2 décimales. Le petit 1e-9 évite qu'une erreur
 * de calcul (2,0000000001) ne donne 3.
 */
export function roundForList(quantity: number, unit: string): number {
  return isCountUnit(unit) ? Math.ceil(quantity - 1e-9) : roundQuantity(quantity);
}

/** 1 200 g → 1,2 kg ; 1 500 ml → 1,5 l (choix validé pour le lot 3). */
export function toDisplayUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  if (unit === "g" && quantity >= 1000) return { quantity: quantity / 1000, unit: "kg" };
  if (unit === "ml" && quantity >= 1000) return { quantity: quantity / 1000, unit: "l" };
  return { quantity, unit };
}

/**
 * Calcule les lignes de la revue à partir des recettes choisies.
 * Règles (SPEC US-LST-02, US-LST-05) :
 * - quantités recalculées selon les portions, puis additionnées par article,
 *   après conversion dans l'unité par défaut de l'article ;
 * - sans conversion possible, lignes séparées (jamais d'addition fausse) ;
 * - ingrédient de base : 1 unité de conditionnement, décoché, quelle que soit la recette ;
 * - ingrédient « au goût » (sans quantité), pas de base : 1 unité par défaut, coché,
 *   sauf si une autre recette en demande déjà une quantité.
 */
export function computeReview(
  recipes: SelectedRecipe[],
  items: Map<string, ReviewItem>,
): ComputedLine[] {
  const lines = new Map<string, ComputedLine>();
  const toTaste = new Map<string, string[]>(); // article « au goût » → recettes
  // Ingrédient de base → quantités demandées par unité (après conversion si possible)
  const stapleNeeds = new Map<string, { byUnit: Map<string, number>; toTaste: boolean }>();

  const addTo = (key: string, item: ReviewItem, line: Partial<ComputedLine>, recipeId: string) => {
    const existing = lines.get(key);
    if (existing) {
      existing.quantity += line.quantity ?? 0;
      if (!existing.recipeIds.includes(recipeId)) existing.recipeIds.push(recipeId);
      return;
    }
    lines.set(key, {
      key,
      itemId: item.id,
      name: item.name,
      aislePosition: item.aislePosition,
      section: "main",
      quantity: 0,
      unit: item.defaultUnit,
      includedByDefault: true,
      recipeIds: [recipeId],
      ...line,
    });
  };

  for (const recipe of recipes) {
    if (recipe.baseServings <= 0 || recipe.servings <= 0) continue;
    const ratio = recipe.servings / recipe.baseServings;

    for (const ingredient of recipe.ingredients) {
      const item = items.get(ingredient.itemId);
      if (!item) continue;

      // Ingrédient de base : toujours 1 conditionnement, décoché par défaut
      if (item.isStaple) {
        addTo(
          `${item.id}:staple`,
          item,
          {
            section: "staple",
            quantity: 0, // fixé à 1 plus bas, quel que soit le nombre de recettes
            unit: item.purchaseUnit ?? item.defaultUnit,
            includedByDefault: false,
          },
          recipe.recipeId,
        );
        const needs = stapleNeeds.get(item.id) ?? { byUnit: new Map(), toTaste: false };
        if (ingredient.quantity === null || ingredient.unit === null) {
          needs.toTaste = true;
        } else {
          const scaled = ingredient.quantity * ratio;
          const converted = convertQuantity(
            scaled,
            ingredient.unit,
            item.defaultUnit,
            item.conversions,
          );
          const unit = converted !== null ? item.defaultUnit : ingredient.unit;
          needs.byUnit.set(unit, (needs.byUnit.get(unit) ?? 0) + (converted ?? scaled));
        }
        stapleNeeds.set(item.id, needs);
        continue;
      }

      // « Au goût » : traité après, une fois connues les autres quantités
      if (ingredient.quantity === null || ingredient.unit === null) {
        toTaste.set(item.id, [...(toTaste.get(item.id) ?? []), recipe.recipeId]);
        continue;
      }

      const scaled = ingredient.quantity * ratio;
      const converted = convertQuantity(
        scaled,
        ingredient.unit,
        item.defaultUnit,
        item.conversions,
      );
      if (converted !== null) {
        addTo(`${item.id}:${item.defaultUnit}`, item, { quantity: converted }, recipe.recipeId);
      } else {
        // Unité impossible à convertir : ligne séparée, dans son unité
        addTo(
          `${item.id}:${ingredient.unit}`,
          item,
          { quantity: scaled, unit: ingredient.unit },
          recipe.recipeId,
        );
      }
    }
  }

  // « Au goût » : 1 unité par défaut, seulement si aucune quantité n'est déjà prévue
  for (const [itemId, recipeIds] of toTaste) {
    const item = items.get(itemId)!;
    const hasQuantity = [...lines.values()].some(
      (l) => l.itemId === itemId && l.section === "main",
    );
    if (hasQuantity) {
      for (const line of lines.values()) {
        if (line.itemId === itemId && line.section === "main") {
          line.recipeIds.push(...recipeIds.filter((id) => !line.recipeIds.includes(id)));
        }
      }
      continue;
    }
    lines.set(`${itemId}:${item.defaultUnit}`, {
      key: `${itemId}:${item.defaultUnit}`,
      itemId,
      name: item.name,
      aislePosition: item.aislePosition,
      section: "main",
      quantity: 1,
      unit: item.defaultUnit,
      includedByDefault: true,
      recipeIds,
    });
  }

  return [...lines.values()]
    .map((line) => {
      if (line.section === "staple") {
        const needs = stapleNeeds.get(line.itemId);
        return {
          ...line,
          quantity: 1,
          requested: [...(needs?.byUnit ?? [])].map(([unit, quantity]) => {
            const display = toDisplayUnit(quantity, unit);
            return { quantity: roundQuantity(display.quantity), unit: display.unit };
          }),
          requestedToTaste: needs?.toTaste ?? false,
        };
      }
      const display = toDisplayUnit(line.quantity, line.unit);
      return { ...line, ...display, quantity: roundForList(display.quantity, display.unit) };
    })
    .sort(
      (a, b) =>
        // Ingrédients de base à la fin, puis ordre des rayons, puis ordre alphabétique
        Number(a.section === "staple") - Number(b.section === "staple") ||
        a.aislePosition - b.aislePosition ||
        a.name.localeCompare(b.name, "fr"),
    );
}

/**
 * Quantité calculée exprimée dans l'unité de référence de la ligne, celle de sa clé
 * (« farine:g » → en g), quelle que soit l'unité affichée (kg) ou choisie (paquet).
 * C'est elle qu'on compare d'un calcul à l'autre pour savoir si la ligne a changé.
 */
function computedInKeyUnit(line: ComputedLine): number {
  if (line.section === "staple") return line.quantity;
  const keyUnit = line.key.split(":").pop()!;
  return convertQuantity(line.quantity, line.unit, keyUnit) ?? line.quantity;
}

/**
 * Fusionne un nouveau calcul avec la revue précédente (retour à l'étape 1).
 * - Ligne retirée (ou cochée/décochée) : mon choix est conservé.
 * - Quantité ajustée à la main : conservée si le calcul n'a pas changé ;
 *   sinon on reprend le nouveau calcul et la ligne est signalée (changed).
 * - Ligne nouvelle (recette ajoutée) : signalée, sauf lors du tout premier calcul.
 * - Ligne qui n'existe plus (recette retirée) : disparaît.
 */
export function mergeReview(previous: ReviewLine[], computed: ComputedLine[]): ReviewLine[] {
  const before = new Map(previous.map((line) => [line.key, line]));
  const isFirstReview = previous.length === 0;

  return computed.map((line) => {
    const old = before.get(line.key);
    if (!old) {
      return {
        ...line,
        computedQuantity: computedInKeyUnit(line),
        included: line.includedByDefault,
        adjusted: false,
        changed: !isFirstReview,
      };
    }

    const computed = computedInKeyUnit(line);
    const unchanged = Math.abs(old.computedQuantity - computed) < 1e-6;
    if (old.adjusted && unchanged) {
      // Mon ajustement tient toujours : on le garde tel quel (y compris son unité)
      return {
        ...line,
        quantity: old.quantity,
        unit: old.unit,
        computedQuantity: old.computedQuantity,
        included: old.included,
        adjusted: true,
        changed: false,
      };
    }
    return {
      ...line,
      computedQuantity: computed,
      included: old.included,
      adjusted: false,
      changed: !unchanged,
    };
  });
}

/** Pas du bouton « − + » selon l'unité (choix validé pour le lot 3). */
export function quantityStep(unit: string): number {
  if (unit === "g" || unit === "ml") return 50;
  if (unit === "cl") return 10;
  if (unit === "kg" || unit === "l") return 0.5;
  return 1;
}

/** Quantité après un appui sur « − » ou « + » ; jamais 0 (pour enlever, on retire la ligne). */
export function stepQuantity(quantity: number, unit: string, direction: 1 | -1): number {
  const next = roundQuantity(quantity + direction * quantityStep(unit));
  return next > 0 ? next : quantity;
}

/** J'ajuste la quantité d'une ligne : elle est marquée « ajustée » et n'est plus signalée. */
export function adjustLine(line: ReviewLine, quantity: number, unit = line.unit): ReviewLine {
  return { ...line, quantity, unit, adjusted: true, changed: false };
}

/**
 * Après un ajustement de quantité : 900 g → 1 200 g devient 1,2 kg ; 1 kg → 0,5 kg
 * devient 500 g (même chose entre ml et l).
 */
export function normalizeUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  if (unit === "g" && quantity >= 1000)
    return { quantity: roundQuantity(quantity / 1000), unit: "kg" };
  if (unit === "kg" && quantity < 1) return { quantity: roundQuantity(quantity * 1000), unit: "g" };
  if (unit === "ml" && quantity >= 1000)
    return { quantity: roundQuantity(quantity / 1000), unit: "l" };
  if (unit === "l" && quantity < 1) return { quantity: roundQuantity(quantity * 1000), unit: "ml" };
  return { quantity, unit };
}

/** Nouvelle quantité saisie ou « − + » : ajustée, puis passée en kg / g, l / ml si besoin. */
export function setLineQuantity(line: ReviewLine, quantity: number): ReviewLine {
  const normalized = normalizeUnit(quantity, line.unit);
  return adjustLine(line, normalized.quantity, normalized.unit);
}

/**
 * Nouvelle unité choisie dans la liste : la quantité est convertie quand c'est
 * possible (1,2 kg → 1 200 g), sinon gardée telle quelle (1,2 kg → 1,2 paquet,
 * à corriger ensuite).
 */
export function setLineUnit(line: ReviewLine, unit: string): ReviewLine {
  const converted = convertQuantity(line.quantity, line.unit, unit);
  return adjustLine(line, converted !== null ? roundQuantity(converted) : line.quantity, unit);
}

/** Texte entre parenthèses d'un ingrédient de base : « 100 g », « 2 c. à soupe + au goût ». */
export function formatRequested(line: ComputedLine): string | null {
  const parts = (line.requested ?? []).map((r) => formatQuantity(r.quantity, r.unit));
  if (line.requestedToTaste) parts.push("au goût");
  return parts.length ? parts.join(" + ") : null;
}
