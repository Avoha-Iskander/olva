import { UNITS } from "@/lib/units";

/** Unités dans l'ordre d'affichage des listes déroulantes. */
export const UNIT_OPTIONS = Object.values(UNITS).map((u) => ({ code: u.code, label: u.label }));

/** Unités de conditionnement proposées pour un ingrédient de base. */
export const PURCHASE_UNIT_OPTIONS = UNIT_OPTIONS.filter((u) =>
  ["bouteille", "paquet", "pot", "sachet", "boite", "piece"].includes(u.code),
);
