/**
 * Fin des courses (US-CRS-03, décision 070) : les articles non cochés peuvent repartir
 * sur une NOUVELLE liste, prête, avec les mêmes partages. Fonction pure, testée.
 */

/** Message de confirmation de « Terminer les courses ». */
export function finishMessage(unchecked: number, ownerName: string | null): string {
  if (unchecked === 0) return "Tous les articles sont dans le panier.";
  const articles = `${unchecked} article${unchecked > 1 ? "s" : ""}`;
  return `${articles} pas encore coché${unchecked > 1 ? "s" : ""}.${
    ownerName ? ` La nouvelle liste éventuelle sera à ${ownerName}.` : ""
  }`;
}
