/**
 * Personnalisations des articles communs (US-CAT-03) : ma valeur remplace celle
 * du catalogue. Fonctions pures, utilisées par le module « mon catalogue »
 * (src/lib/my-catalogue.ts) pour la revue, l'étape 3, la liste, les courses et l'import.
 */
import type { ItemConversion } from "@/lib/units";

export type ItemOverride = {
  itemId: string;
  aisleId: number | null; // null : rayon du catalogue
  isStaple: boolean | null; // null : valeur du catalogue
  purchaseUnit: string | null;
};

export type AisleInfo = { name: string; position: number };

/** Ce qu'une personnalisation peut changer dans un article. */
export type OverridableItem = {
  id: string;
  aisleId: number;
  aisleName?: string;
  aislePosition: number;
  isStaple: boolean;
  purchaseUnit: string | null;
};

/** Applique ma personnalisation (s'il y en a une) à un article. */
export function applyOverride<T extends OverridableItem>(
  item: T,
  override: ItemOverride | undefined,
  aisles: Map<number, AisleInfo>,
): T {
  if (!override) return item;
  const aisleId = override.aisleId ?? item.aisleId;
  const aisle = aisles.get(aisleId);
  const isStaple = override.isStaple ?? item.isStaple;
  return {
    ...item,
    aisleId,
    aisleName: aisle?.name ?? item.aisleName,
    aislePosition: aisle?.position ?? item.aislePosition,
    isStaple,
    // Un ingrédient de base garde une unité de conditionnement
    purchaseUnit: override.purchaseUnit ?? item.purchaseUnit,
  };
}

/**
 * Conversions d'un article : les miennes passent avant celles du catalogue
 * (convertQuantity prend la première qui convient).
 */
export function preferMine<T extends { ownerId: string | null }>(
  conversions: T[],
  userId: string | null,
): T[] {
  return [...conversions].sort(
    (a, b) => Number(b.ownerId === userId) - Number(a.ownerId === userId),
  );
}

/** Une conversion telle que lue en base (communes et les miennes). */
export type ConversionRow = {
  item_id: string;
  owner_id: string | null;
  from_unit: string;
  to_unit: string;
  factor: number | string; // numeric : la base peut le renvoyer en texte
};

/**
 * Range les conversions par article, les miennes d'abord : c'est la seule façon de
 * les préparer pour convertQuantity, partout dans l'app (décision 061).
 */
export function conversionsByItem(
  rows: ConversionRow[],
  userId: string | null,
): Map<string, ItemConversion[]> {
  const byItem = new Map<string, ItemConversion[]>();
  for (const row of preferMine(
    rows.map((r) => ({ ...r, ownerId: r.owner_id })),
    userId,
  )) {
    const list = byItem.get(row.item_id) ?? [];
    list.push({ fromUnit: row.from_unit, toUnit: row.to_unit, factor: Number(row.factor) });
    byItem.set(row.item_id, list);
  }
  return byItem;
}
