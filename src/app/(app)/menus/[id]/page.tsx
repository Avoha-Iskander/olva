import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeleteMenuButton } from "@/components/menus/delete-menu-button";
import { MenuView } from "@/components/menus/menu-view";
import { ShareMenuButton } from "@/components/sharing/share-menu-button";
import { Button } from "@/components/ui/button";
import { getMenu } from "@/lib/menus";
import { parseId } from "@/lib/menu-return";
import { listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Menu — Olva" };

/** Fiche d'un menu (US-MEN-05) : ses recettes, la liste ; Partager, Modifier, Supprimer. */
export default function MenuPage({ params }: PageProps<"/menus/[id]">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <Link
        href="/menus"
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Mes menus
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Menu params={params} />
      </Suspense>
    </main>
  );
}

async function Menu({ params }: { params: PageProps<"/menus/[id]">["params"] }) {
  const { id } = await params;
  if (!parseId(id)) notFound();
  const [menu, recipes] = await Promise.all([getMenu(id), listMyRecipes({})]);
  if (!menu) notFound();

  // Titre et miniature des recettes du menu (dans l'ordre du menu)
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const menuRecipes = menu.recipes.flatMap((r) => {
    const recipe = byId.get(r.recipeId);
    return recipe
      ? [
          {
            recipeId: r.recipeId,
            title: recipe.title,
            thumbUrl: recipe.thumbUrl,
            servings: r.servings,
          },
        ]
      : [];
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{menu.name}</h1>
          {menu.sharedBy && (
            <p className="text-muted-foreground text-sm">Menu partagé par {menu.sharedBy}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Seul le créateur partage son menu (décision 077) */}
          {!menu.sharedBy && <ShareMenuButton menuId={menu.id} menuName={menu.name} />}
          <Button asChild variant="outline">
            <Link href={`/menus/${menu.id}/modifier`}>
              <Pencil />
              Modifier
            </Link>
          </Button>
        </div>
      </div>
      <MenuView menuId={menu.id} recipes={menuRecipes} list={menu.list} />
      {/* Seul le créateur supprime le menu ; la personne y renonce depuis Mes menus */}
      {!menu.sharedBy && <DeleteMenuButton menuId={menu.id} hasList={menu.list !== null} />}
    </>
  );
}
