/**
 * Le catalogue, mis en forme pour Claude (US-CAT-05, décision 057).
 *
 * En donnant la liste des articles à Claude, on lui fait choisir directement le bon
 * article (« Tomates concassées », « Bouillon de bœuf ») au lieu d'inventer un nom que
 * l'app devrait ensuite deviner.
 *
 * Deux blocs :
 * - le catalogue COMMUN, identique pour tout le monde : mis en cache chez Anthropic
 *   (« prompt caching »), il ne coûte presque rien après le premier import ;
 * - MES articles personnels, propres à chacun (non mis en cache).
 */
import { UNITS } from "@/lib/units";

type PromptItem = { name: string; defaultUnit: string; isPersonal: boolean };

/** « Beurre — g », « Oignon — pièce » : une ligne par article, par ordre alphabétique. */
function lines(items: PromptItem[]): string {
  return [...items]
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map(
      (item) =>
        `${item.name} — ${UNITS[item.defaultUnit as keyof typeof UNITS]?.label ?? item.defaultUnit}`,
    )
    .join("\n");
}

export function catalogueForPrompt(
  items: PromptItem[],
  aisleNames: string[],
): { common: string; personal: string | null } {
  const common = items.filter((i) => !i.isPersonal);
  const personal = items.filter((i) => i.isPersonal);
  return {
    common: [
      "Rayons possibles pour un nouvel article :",
      aisleNames.join(" ; "),
      "",
      "Catalogue commun (nom exact — unité habituelle) :",
      lines(common),
    ].join("\n"),
    personal: personal.length
      ? ["Articles personnels de l'utilisateur (prioritaires) :", lines(personal)].join("\n")
      : null,
  };
}
