import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MenuForm } from "@/components/menus/menu-form";
import { getMenu } from "@/lib/menus";
import { parseId } from "@/lib/menu-return";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Modifier le menu — Olva" };

/** Modifier un menu (US-MEN-01) : le formulaire, prérempli. */
export default function EditMenuPage({ params, searchParams }: PageProps<"/menus/[id]/modifier">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Form params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({
  params,
  searchParams,
}: {
  params: PageProps<"/menus/[id]/modifier">["params"];
  searchParams: PageProps<"/menus/[id]/modifier">["searchParams"];
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
      <Link
        href={`/menus/${menu.id}`}
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Retour au menu
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Modifier le menu</h1>
      <MenuForm
        // Clé : un nouvel affichage repart du menu enregistré (qui contient la recette
        // ajoutée), même si Next.js gardait l'ancien écran en mémoire
        key={added ?? "menu"}
        menuId={menu.id}
        initialName={menu.name}
        initialSelected={menu.recipes.map(({ recipeId, servings }) => ({ recipeId, servings }))}
        recipes={recipes} // déjà par ordre alphabétique (listMyRecipes)
        collections={collections}
        defaultServings={profile.default_servings}
        hasOpenList={menu.list !== null && menu.list.status !== "done"}
        addedTitle={addedTitle}
      />
    </>
  );
}
