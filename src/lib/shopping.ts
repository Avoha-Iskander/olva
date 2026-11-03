import { getListPage, listMyLists, type ListSummary } from "@/lib/lists";

/**
 * Données du mode courses (US-CRS-01). Côté serveur : lecture avec la session de
 * l'utilisateur, les règles RLS limitent aux listes que je peux voir.
 */

/** Listes à faire : prêtes ou déjà en courses (les miennes et celles qu'on me partage). */
export async function listShoppableLists(): Promise<ListSummary[]> {
  const lists = await listMyLists();
  return lists.filter((l) => l.status === "ready" || l.status === "shopping");
}

/** Une liste ouverte en mode courses, avec qui a coché quoi. */
export async function getShoppingList(id: string) {
  const list = await getListPage(id);
  if (!list) return null;
  return list;
}
