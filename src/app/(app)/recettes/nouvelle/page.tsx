import { redirect } from "next/navigation";
import { Suspense } from "react";

import { NewRecipeForm } from "@/components/recipe-form/new-recipe-form";
import { getCatalogue } from "@/lib/catalogue";
import { parseListReturn } from "@/lib/list-return";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections } from "@/lib/recipes";

export const metadata = { title: "Nouvelle recette — Olva" };

export default function NewRecipePage({ searchParams }: PageProps<"/recettes/nouvelle">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nouvelle recette</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NewRecipeScreen searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewRecipeScreen({
  searchParams,
}: {
  searchParams: PageProps<"/recettes/nouvelle">["searchParams"];
}) {
  const [profile, catalogue, collections, query] = await Promise.all([
    getCurrentProfile(),
    getCatalogue(),
    listMyCollections(),
    searchParams,
  ]);
  if (!profile) redirect("/connexion");

  return (
    <NewRecipeForm
      // Venu de l'étape 1 d'une liste : on y reviendra, recette cochée (décision 064)
      returnToList={parseListReturn(query.liste)}
      userId={profile.id}
      defaultServings={profile.default_servings}
      items={catalogue.items}
      aisles={catalogue.aisles}
      collections={collections}
    />
  );
}
