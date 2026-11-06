import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { RecipePicker } from "@/components/lists/recipe-picker";
import { StepHeader } from "@/components/lists/step-header";
import { parseId } from "@/lib/list-return";
import { getList } from "@/lib/lists";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Recettes de la liste — Olva" };

// Étape 1 d'une liste existante (brouillon) : modifier les recettes et les portions.
export default function ListRecipesPage({
  params,
  searchParams,
}: PageProps<"/listes/[id]/recettes">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <StepHeader step={1} title="Préparer la liste" subtitle="Recettes" />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Picker params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Picker({
  params,
  searchParams,
}: {
  params: PageProps<"/listes/[id]/recettes">["params"];
  searchParams: PageProps<"/listes/[id]/recettes">["searchParams"];
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [profile, list, recipes, collections] = await Promise.all([
    getCurrentProfile(),
    getList(id),
    listMyRecipes({}),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");
  if (!list) notFound();
  // Liste prête : les étapes sont fermées, on la modifie depuis sa page (décision 044)
  if (list.status !== "draft") redirect(`/listes/${id}`);

  // Retour de « Créer une recette » (décision 064) : la recette est déjà cochée en base
  const added = parseId(query.ajout);
  const addedTitle = recipes.find((r) => r.id === added)?.title ?? null;

  return (
    <RecipePicker
      // Clé : un nouvel affichage repart de la sélection enregistrée (qui contient la
      // recette ajoutée), même si Next.js gardait l'ancien écran en mémoire
      key={added ?? "liste"}
      addedTitle={addedTitle}
      recipes={recipes} // déjà par ordre alphabétique (listMyRecipes)
      collections={collections}
      initialListId={list.id}
      initialSelected={list.recipes}
      defaultServings={profile.default_servings}
    />
  );
}
