import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { getCatalogue } from "@/lib/catalogue";
import { getCurrentProfile } from "@/lib/profile";
import { getRecipeForEdit, listMyCollections } from "@/lib/recipes";

export const metadata = { title: "Modifier la recette — Olva" };

export default function EditRecipePage({ params }: PageProps<"/recettes/[id]/modifier">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Modifier la recette</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <EditRecipeForm params={params} />
      </Suspense>
    </main>
  );
}

async function EditRecipeForm({
  params,
}: {
  params: PageProps<"/recettes/[id]/modifier">["params"];
}) {
  const { id } = await params;
  const [profile, recipe, catalogue, collections] = await Promise.all([
    getCurrentProfile(),
    getRecipeForEdit(id),
    getCatalogue(),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");
  if (!recipe) notFound();

  return (
    <RecipeForm
      recipeId={recipe.id}
      userId={profile.id}
      defaultServings={profile.default_servings}
      items={catalogue.items}
      aisles={catalogue.aisles}
      collections={collections}
      initial={recipe}
    />
  );
}
