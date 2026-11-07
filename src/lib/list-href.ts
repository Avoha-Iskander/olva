import type { ListStatus } from "@/lib/lists";

// Sans accès à la base : utilisable par les pages serveur ET les composants client.
/**
 * Adresse où reprendre une liste : sa page si elle est prête ; sinon son étape en cours,
 * la revue (liste tirée d'un menu) ou la pré-liste (liste sans recette, US-LST-08).
 */
export function listHref(list: { id: string; status: ListStatus; hasRecipes: boolean }) {
  if (list.status !== "draft") return `/listes/${list.id}`;
  return list.hasRecipes ? `/listes/${list.id}/revue` : `/listes/${list.id}/pre-liste`;
}
