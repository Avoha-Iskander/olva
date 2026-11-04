"use client";

/**
 * Stockage hors ligne sur le téléphone (US-CRS-02), avec idb-keyval (décision 053).
 *
 * IndexedDB est une petite base de données intégrée au navigateur, qui survit à la
 * fermeture de l'app et fonctionne sans réseau. idb-keyval la rend aussi simple qu'un
 * dictionnaire : get(clé) / set(clé, valeur) / del(clé).
 *
 * On y garde, par liste : la dernière version connue (pour l'ouvrir hors ligne) et la
 * file des coches à envoyer. Tout est effacé à la déconnexion (clearOfflineData).
 * Les erreurs (navigation privée, stockage plein…) sont ignorées : le mode hors ligne
 * est un plus, il ne doit jamais empêcher l'app de fonctionner en ligne.
 */
import { clear, createStore, del, get, set } from "idb-keyval";

import type { PendingCheck } from "@/lib/offline-queue";
import type { ShoppingLine } from "@/lib/shopping-lines";

/** La version d'une liste gardée sur le téléphone. */
export type SavedList = {
  lines: ShoppingLine[];
  names: Record<string, string>;
  savedAt: string;
};

// Une base dédiée à Olva, avec un seul « tiroir » (store)
const store = typeof indexedDB === "undefined" ? undefined : createStore("olva", "hors-ligne");

const listKey = (listId: string) => `liste:${listId}`;
const queueKey = (listId: string) => `file:${listId}`;

async function safely<T>(action: () => Promise<T>, fallback: T): Promise<T> {
  if (!store) return fallback;
  try {
    return await action();
  } catch {
    return fallback;
  }
}

export const loadSavedList = (listId: string) =>
  safely(() => get<SavedList>(listKey(listId), store), undefined);

export const saveList = (listId: string, list: SavedList) =>
  safely(() => set(listKey(listId), list, store), undefined);

export const loadQueue = (listId: string) =>
  safely(async () => (await get<PendingCheck[]>(queueKey(listId), store)) ?? [], []);

export const saveQueue = (listId: string, queue: PendingCheck[]) =>
  safely(
    () => (queue.length ? set(queueKey(listId), queue, store) : del(queueKey(listId), store)),
    undefined,
  );

/** Déconnexion : rien de mes listes ne doit rester sur le téléphone. */
export async function clearOfflineData() {
  await safely(() => clear(store), undefined);
  // Pages gardées par le service worker
  if (typeof caches !== "undefined") {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("olva-")).map((n) => caches.delete(n)));
    } catch {
      // rien à faire : le cache sera remplacé à la prochaine version
    }
  }
}
