import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { DeleteMenuButton } from "@/components/menus/delete-menu-button";
import { MenuEditor } from "@/components/menus/menu-editor";
import { MenuName } from "@/components/menus/menu-name";
import { getMenu } from "@/lib/menus";
import { parseId } from "@/lib/menu-return";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Menu — Olva" };

/** Un menu de la semaine (US-MEN-01, US-MEN-02). */
export default function MenuPage({ params, searchParams }: PageProps<"/menus/[id]">) {
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
        <Menu params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Menu({
  params,
  searchParams,
}: {
  params: PageProps<"/menus/[id]">["params"];
  searchParams: PageProps<"/menus/[id]">["searchParams"];
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!parseId(id)) notFound();
  const [profile, menu, recipes, collections] = await Promise.all([
    getCurrentProfile(),
    getMenu(id),
    listMyRecipes({}),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");
  if (!menu) notFound();

  // Retour de « Créer une recette » (décision 064) : la recette est déjà ajoutée en base
  const added = parseId(query.ajout);
  const addedTitle = recipes.find((r) => r.id === added)?.title ?? null;

  return (
    <>
      <MenuName menuId={menu.id} initialName={menu.name} />
      <MenuEditor
        // Clé : un nouvel affichage repart de la sélection enregistrée (qui contient la
        // recette ajoutée), même si Next.js gardait l'ancien écran en mémoire
        key={added ?? "menu"}
        menuId={menu.id}
        addedTitle={addedTitle}
        recipes={recipes} // déjà par ordre alphabétique (listMyRecipes)
        collections={collections}
        initialSelected={menu.recipes.map(({ recipeId, servings }) => ({ recipeId, servings }))}
        defaultServings={profile.default_servings}
        list={menu.list}
      />
      <DeleteMenuButton menuId={menu.id} hasList={menu.list !== null} />
    </>
  );
}
