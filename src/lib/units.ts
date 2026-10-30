/**
 * Unités et conversions (US-CAT-04).
 *
 * Même liste que la table « units » en base. Trois cas de conversion :
 * 1. Même famille (poids ou volume) : conversion universelle via to_base
 *    (1 kg = 1000 g ; 1 c. à soupe = 15 ml).
 * 2. Conversion propre à un article (ex. tomate cerise : 1 boîte = 250 g),
 *    éventuellement combinée avec une conversion universelle (boîte → kg).
 * 3. Sinon : impossible → on renvoie null et les quantités restent séparées
 *    (règle du SPEC : jamais d'addition fausse).
 */

export type UnitKind = "weight" | "volume" | "count" | "other";

export type Unit = {
  code: string;
  label: string;
  kind: UnitKind;
  toBase: number | null; // facteur vers g (poids) ou ml (volume)
};

export const UNITS = {
  g: { code: "g", label: "g", kind: "weight", toBase: 1 },
  kg: { code: "kg", label: "kg", kind: "weight", toBase: 1000 },
  ml: { code: "ml", label: "ml", kind: "volume", toBase: 1 },
  cl: { code: "cl", label: "cl", kind: "volume", toBase: 10 },
  l: { code: "l", label: "l", kind: "volume", toBase: 1000 },
  cac: { code: "cac", label: "c. à café", kind: "volume", toBase: 5 },
  cas: { code: "cas", label: "c. à soupe", kind: "volume", toBase: 15 },
  pincee: { code: "pincee", label: "pincée", kind: "other", toBase: null },
  piece: { code: "piece", label: "pièce", kind: "count", toBase: null },
  boite: { code: "boite", label: "boîte", kind: "count", toBase: null },
  sachet: { code: "sachet", label: "sachet", kind: "count", toBase: null },
  paquet: { code: "paquet", label: "paquet", kind: "count", toBase: null },
  pot: { code: "pot", label: "pot", kind: "count", toBase: null },
  bouteille: { code: "bouteille", label: "bouteille", kind: "count", toBase: null },
  botte: { code: "botte", label: "botte", kind: "count", toBase: null },
  tranche: { code: "tranche", label: "tranche", kind: "count", toBase: null },
  gousse: { code: "gousse", label: "gousse", kind: "count", toBase: null },
  brin: { code: "brin", label: "brin", kind: "count", toBase: null },
  feuille: { code: "feuille", label: "feuille", kind: "count", toBase: null },
} as const satisfies Record<string, Unit>;

export type UnitCode = keyof typeof UNITS;

export function isUnitCode(code: string): code is UnitCode {
  return code in UNITS;
}

/** Conversion propre à un article : 1 fromUnit = factor toUnit. */
export type ItemConversion = { fromUnit: string; toUnit: string; factor: number };

/** Conversion universelle à l'intérieur d'une même famille (poids ou volume). */
function convertWithinKind(quantity: number, from: Unit, to: Unit): number | null {
  if (from.code === to.code) return quantity;
  if (from.kind !== to.kind || from.toBase === null || to.toBase === null) return null;
  return (quantity * from.toBase) / to.toBase;
}

function unitOf(code: string): Unit | null {
  return isUnitCode(code) ? UNITS[code] : null;
}

/**
 * Convertit une quantité d'une unité vers une autre.
 * Renvoie null si la conversion est impossible.
 */
export function convertQuantity(
  quantity: number,
  fromCode: string,
  toCode: string,
  itemConversions: ItemConversion[] = [],
): number | null {
  const from = unitOf(fromCode);
  const to = unitOf(toCode);
  if (!from || !to) return null;

  const direct = convertWithinKind(quantity, from, to);
  if (direct !== null) return direct;

  // Conversions de l'article, dans les deux sens, combinées si besoin
  // avec une conversion universelle (ex. 1 boîte = 250 g, demandé en kg)
  for (const c of itemConversions) {
    const cFrom = unitOf(c.fromUnit);
    const cTo = unitOf(c.toUnit);
    if (!cFrom || !cTo || c.factor <= 0) continue;

    // Sens direct : from → (c.from) → (c.to) → to
    const inCFrom = convertWithinKind(quantity, from, cFrom);
    if (inCFrom !== null) {
      const result = convertWithinKind(inCFrom * c.factor, cTo, to);
      if (result !== null) return result;
    }

    // Sens inverse : from → (c.to) → (c.from) → to
    const inCTo = convertWithinKind(quantity, from, cTo);
    if (inCTo !== null) {
      const result = convertWithinKind(inCTo / c.factor, cFrom, to);
      if (result !== null) return result;
    }
  }

  return null;
}

/** Arrondi d'affichage : 2 décimales au plus, sans zéros inutiles (1.5 et non 1.50). */
export function roundQuantity(quantity: number): number {
  return Math.round(quantity * 100) / 100;
}

/** « 250 g », « 2 c. à soupe », « 3 » (pièce : pas d'unité affichée). */
export function formatQuantity(quantity: number, unitCode: string): string {
  const value = roundQuantity(quantity).toLocaleString("fr-FR");
  if (unitCode === "piece") return value;
  const unit = unitOf(unitCode);
  return unit ? `${value} ${unit.label}` : value;
}
