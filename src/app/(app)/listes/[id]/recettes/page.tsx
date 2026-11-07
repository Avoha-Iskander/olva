import { notFound, redirect } from "next/navigation";

import { getList, listHref } from "@/lib/lists";

// Ancienne étape 1 d'une liste (décision 068) : les recettes se choisissent dans le menu.
// On renvoie vers le menu de la liste, ou vers son étape en cours.
export default async function ListRecipesPage({ params }: PageProps<"/listes/[id]/recettes">) {
  const { id } = await params;
  const list = await getList(id);
  if (!list) notFound();
  if (list.menuId) redirect(`/menus/${list.menuId}`);
  redirect(listHref({ id, status: list.status, hasRecipes: list.recipes.length > 0 }));
}
