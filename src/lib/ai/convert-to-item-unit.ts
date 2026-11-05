/**
 * Conversion automatique à l'import (US-CAT-05, décision 059).
 * « 200 g de carottes » alors que l'article Carotte se compte en pièces → « 2 pièces »,
 * grâce au poids moyen (1 pièce = 100 g). La quantité de la recette reste lisible dans
 * la note (« 200 g dans la recette »).
 * Fonction pure : aucune base, aucun réseau, facile à tester.
 */
import {
  convertQuantity,
  type ItemConversion,
  isUnitCode,
  roundQuantity,
  UNITS,
} from "@/lib/units";

export type ImportedLine = { quantity: number | null; unit: string | null; note: string | null };

/** « 200 g », « 4 tranches », « 2 pièces » : la quantité d'origine, pour la note. */
function describe(quantity: number, unit: string): string {
  const value = roundQuantity(quantity).toLocaleString("fr-FR");
  if (!isUnitCode(unit)) return value;
  const { label, kind } = UNITS[unit];
  // Unités de comptage : pluriel simple (pièces, tranches, boîtes…)
  return `${value} ${kind === "count" && quantity > 1 ? `${label}s` : label}`;
}

/**
 * Arrondi d'une quantité convertie, pour qu'elle reste « naturelle » :
 * - au comptage, à la demi-pièce près (150 g d'oignon → 1,5 pièce) ;
 * - en g ou en ml, à l'unité (4 tranches × 250 g → 1000 g) ;
 * - sinon (kg, l, cl), 2 décimales au plus.
 */
function roundFor(quantity: number, unit: string): number {
  if (isUnitCode(unit) && UNITS[unit].kind === "count") return Math.round(quantity * 2) / 2;
  if (unit === "g" || unit === "ml") return Math.round(quantity);
  return roundQuantity(quantity);
}

/**
 * Met une ligne importée dans l'unité habituelle de l'article, quand c'est utile et sûr :
 * - seulement entre familles d'unités différentes (poids ↔ pièces, tranches ↔ g…) :
 *   « 500 g » de pommes de terre reste « 500 g », même si l'article est en kg ;
 * - seulement si une conversion est connue pour cet article ;
 * - jamais pour moins d'une demi-pièce (20 g d'oignon ne fait pas « 0 pièce ») ;
 * sinon la ligne est renvoyée telle quelle.
 */
export function convertToItemUnit(
  line: ImportedLine,
  itemUnit: string,
  conversions: ItemConversion[],
): ImportedLine {
  const { quantity, unit } = line;
  if (quantity === null || !unit || unit === itemUnit) return line;
  if (!isUnitCode(unit) || !isUnitCode(itemUnit)) return line;

  const fromKind = UNITS[unit].kind;
  const toKind = UNITS[itemUnit].kind;
  // Même famille (g ↔ kg, cl ↔ l) : déjà additionnable, on garde l'écriture de la recette
  if (fromKind === toKind && fromKind !== "count") return line;
  if (fromKind === "other" || toKind === "other") return line; // pincée : rien à convertir

  const converted = convertQuantity(quantity, unit, itemUnit, conversions);
  if (converted === null) return line;
  const rounded = roundFor(converted, itemUnit);
  if (rounded <= 0) return line;

  // La quantité de la recette, gardée dans la note (sans doublon si elle y est déjà)
  const original = describe(quantity, unit);
  const note = line.note?.trim() ?? "";
  const keep = note.includes(original)
    ? note
    : [`${original} dans la recette`, note].filter(Boolean).join(" ; ");

  return { quantity: rounded, unit: itemUnit, note: keep };
}
