/**
 * Personnalisations des articles communs (US-CAT-03) : ma valeur remplace celle
 * du catalogue. Fonctions pures, utilisées par la revue, l'étape 3 et la liste.
 */

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
