import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { RecipePicker } from "@/components/lists/recipe-picker";
import { StepHeader } from "@/components/lists/step-header";
import { getList } from "@/lib/lists";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Recettes de la liste — Olva" };

// Étape 1 d'une liste existante (brouillon) : modifier les recettes et les portions.
export default function ListRecipesPage({ params }: PageProps<"/listes/[id]/recettes">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <StepHeader step={1} title="Préparer la liste" subtitle="Recettes" />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Picker params={params} />
      </Suspense>
    </main>
  );
}

async function Picker({ params }: { params: PageProps<"/listes/[id]/recettes">["params"] }) {
  const { id } = await params;
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

  return (
    <RecipePicker
      recipes={[...recipes].sort((a, b) => a.title.localeCompare(b.title, "fr"))}
      collections={collections}
      initialListId={list.id}
      initialSelected={list.recipes}
      defaultServings={profile.default_servings}
    />
  );
}
