/**
 * Retire d'un titre les formules publicitaires des sites de recettes (US-CAT-05) :
 * « Osso bucco de veau : la meilleure recette » → « Osso bucco de veau ».
 * Seule une fin de titre après « : », « - », « | » ou « – » est retirée, et seulement
 * si elle ressemble à une formule (« recette », « facile », « rapide »…) : « Tarte
 * Tatin » ou « Poulet basquaise » restent intacts.
 */
const PROMO =
  /\b(recettes?|facile|rapide|simple|inratable|meilleure?s?|traditionnelle?|maison|express|délicieuse?|ultra|parfaite?|astuces?|pas à pas|de grand-mère|de mamie|marmiton)\b/i;

export function cleanTitle(title: string): string {
  let result = title.trim();
  // On retire une fin à la fois, tant qu'elle ressemble à une formule
  for (;;) {
    const match = result.match(/^(.*\S)\s*[:|–—-]\s+([^:|–—]+)$/);
    if (!match || !PROMO.test(match[2])) break;
    result = match[1].trim();
  }
  return result;
}
