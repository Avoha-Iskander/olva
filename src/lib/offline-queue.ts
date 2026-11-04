import type { ShoppingLine } from "@/lib/shopping-lines";

/**
 * Hors ligne (US-CRS-02) : la file des coches à envoyer au retour du réseau.
 * Fonctions pures, testées avec Vitest. Le stockage (IndexedDB) est dans offline-store.ts.
 *
 * Règle du SPEC : « coché gagne ». Hors ligne, on peut cocher ; décocher n'est possible
 * que pour une coche pas encore envoyée (simple erreur de doigt), jamais pour une coche
 * déjà connue du serveur : sinon on pourrait effacer la coche d'une autre personne.
 */

/** Une coche en attente d'envoi. */
export type PendingCheck = { lineId: string; checkedAt: string };

/** Peut-on toucher cette ligne maintenant ? */
export function canToggle(
  line: Pick<ShoppingLine, "id" | "checked">,
  online: boolean,
  pending: PendingCheck[],
): boolean {
  if (online || !line.checked) return true;
  // Hors ligne et coché : seulement si c'est une coche faite hors ligne, pas encore partie
  return pending.some((p) => p.lineId === line.id);
}

/**
 * Hors ligne, toucher une ligne :
 * - pas cochée → cochée, et la coche rejoint la file ;
 * - cochée hors ligne (en file) → décochée, et la coche quitte la file ;
 * - cochée avant (connue du serveur) → rien (décocher : en ligne seulement).
 */
export function toggleOffline(
  lines: ShoppingLine[],
  pending: PendingCheck[],
  lineId: string,
  userId: string | null,
  now: string,
): { lines: ShoppingLine[]; pending: PendingCheck[] } {
  const line = lines.find((l) => l.id === lineId);
  if (!line || !canToggle(line, false, pending)) return { lines, pending };

  if (!line.checked) {
    return {
      lines: lines.map((l) =>
        l.id === lineId ? { ...l, checked: true, checkedBy: userId, checkedAt: now } : l,
      ),
      pending: [...pending.filter((p) => p.lineId !== lineId), { lineId, checkedAt: now }],
    };
  }
  return {
    lines: lines.map((l) =>
      l.id === lineId ? { ...l, checked: false, checkedBy: null, checkedAt: null } : l,
    ),
    pending: pending.filter((p) => p.lineId !== lineId),
  };
}

/**
 * Lignes relues du serveur, avec mes coches pas encore envoyées par-dessus :
 * tant qu'elles ne sont pas parties, elles restent affichées (« coché gagne »).
 * Une ligne retirée entre-temps de la liste par l'autre personne disparaît.
 */
export function mergePending(
  serverLines: ShoppingLine[],
  pending: PendingCheck[],
  userId: string | null,
) {
  const byLine = new Map(pending.map((p) => [p.lineId, p]));
  return serverLines.map((l) => {
    const mine = byLine.get(l.id);
    return mine && !l.checked
      ? { ...l, checked: true, checkedBy: userId, checkedAt: mine.checkedAt }
      : l;
  });
}

/** Coches de la file qui concernent encore une ligne de la liste (les autres sont oubliées). */
export function stillRelevant(pending: PendingCheck[], lines: Pick<ShoppingLine, "id">[]) {
  const ids = new Set(lines.map((l) => l.id));
  return pending.filter((p) => ids.has(p.lineId));
}

/** Bandeau affiché en haut de l'écran de courses. */
export function syncBanner(online: boolean, pendingCount: number, syncing: boolean): string | null {
  const coches = `${pendingCount} coche${pendingCount > 1 ? "s" : ""}`;
  if (!online) {
    return pendingCount
      ? `Hors ligne — ${coches} ${pendingCount > 1 ? "seront envoyées" : "sera envoyée"} au retour du réseau`
      : "Hors ligne — vous pouvez continuer à cocher";
  }
  if (syncing && pendingCount) return `Envoi de ${coches}…`;
  return null;
}
