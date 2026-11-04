/**
 * Report des articles non cochés (US-CRS-03, décision 055). Fonctions pures, testées.
 *
 * Fin des courses : les articles non cochés vont dans ma réserve « à reporter »
 * (table carryover_items, remplie par la base). À l'étape 3 de ma prochaine liste,
 * chaque report est proposé, coché par défaut : je le garde ou je le retire.
 */

/** Un article de ma réserve à reporter. */
export type CarryoverItem = {
  itemId: string;
  name: string;
  aisleName?: string;
  aislePosition: number;
  quantity: number;
  unit: string;
};

/** Ligne « carryover » déjà enregistrée pour la liste en préparation. */
export type SavedCarryoverLine = { itemId: string; unit: string; included: boolean };

/** Un report proposé à l'étape 3, gardé ou non. */
export type CarryoverChoice = CarryoverItem & { key: string; kept: boolean };

/** Clé d'un report : un même article peut être reporté dans deux unités. */
export const carryoverKey = (item: { itemId: string; unit: string }) =>
  `${item.itemId}:${item.unit}`;

/**
 * Reports proposés : gardés par défaut, sauf ceux que j'ai déjà retirés pour cette liste
 * (enregistrés « non retenus »).
 */
export function carryoverChoices(
  pool: CarryoverItem[],
  saved: SavedCarryoverLine[],
): CarryoverChoice[] {
  const decisions = new Map(saved.map((s) => [carryoverKey(s), s.included]));
  return pool.map((item) => ({
    ...item,
    key: carryoverKey(item),
    kept: decisions.get(carryoverKey(item)) ?? true,
  }));
}

/** Lignes à enregistrer pour la liste : TOUS les reports, gardés ou non (included). */
export function carryoverLines(choices: CarryoverChoice[]) {
  return choices.map((c) => ({
    itemId: c.itemId,
    origin: "carryover" as const,
    quantity: c.quantity,
    unit: c.unit,
    included: c.kept,
    lineKey: `carryover:${c.key}`,
  }));
}

/** Message de confirmation de « Terminer les courses ». */
export function finishMessage(unchecked: number, ownerName: string | null): string {
  if (unchecked === 0) return "Tous les articles sont dans le panier.";
  const articles = `${unchecked} article${unchecked > 1 ? "s" : ""} non coché${unchecked > 1 ? "s" : ""}`;
  const verb = unchecked > 1 ? "seront reportés" : "sera reporté";
  return ownerName
    ? `${articles} ${verb} sur la prochaine liste de ${ownerName}.`
    : `${articles} ${verb} sur votre prochaine liste.`;
}

/**
 * Reports sur lesquels je n'ai rien décidé pour cette liste (étape 3 passée sans y
 * toucher) : ils sont gardés par défaut au moment de terminer la préparation.
 */
export function undecidedCarryover<T extends { itemId: string; unit: string }>(
  pool: T[],
  saved: Pick<SavedCarryoverLine, "itemId" | "unit">[],
): T[] {
  const decided = new Set(saved.map(carryoverKey));
  return pool.filter((item) => !decided.has(carryoverKey(item)));
}
