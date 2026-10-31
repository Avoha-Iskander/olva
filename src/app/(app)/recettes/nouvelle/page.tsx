import { redirect } from "next/navigation";
import { Suspense } from "react";

import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { getCatalogue } from "@/lib/catalogue";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections } from "@/lib/recipes";

export const metadata = { title: "Nouvelle recette — Olva" };

export default function NewRecipePage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nouvelle recette</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NewRecipeForm />
      </Suspense>
    </main>
  );
}

async function NewRecipeForm() {
  const [profile, catalogue, collections] = await Promise.all([
    getCurrentProfile(),
    getCatalogue(),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");

  return (
    <RecipeForm
      // L'identifiant est choisi dès maintenant : il sert aussi de dossier pour la photo
      recipeId={crypto.randomUUID()}
      userId={profile.id}
      defaultServings={profile.default_servings}
      items={catalogue.items}
      aisles={catalogue.aisles}
      collections={collections}
      initial={null}
    />
  );
}
