import { redirect } from "next/navigation";
import { Suspense } from "react";

import { NewRecipeForm } from "@/components/recipe-form/new-recipe-form";
import { getCatalogue } from "@/lib/catalogue";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections } from "@/lib/recipes";

export const metadata = { title: "Nouvelle recette — Olva" };

export default function NewRecipePage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nouvelle recette</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NewRecipeScreen />
      </Suspense>
    </main>
  );
}

async function NewRecipeScreen() {
  const [profile, catalogue, collections] = await Promise.all([
    getCurrentProfile(),
    getCatalogue(),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");

  return (
    <NewRecipeForm
      userId={profile.id}
      defaultServings={profile.default_servings}
      items={catalogue.items}
      aisles={catalogue.aisles}
      collections={collections}
    />
  );
}
