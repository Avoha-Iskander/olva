import { redirect } from "next/navigation";
import { Suspense } from "react";

import { StepHeader } from "@/components/lists/step-header";
import { RecipePicker } from "@/components/lists/recipe-picker";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Nouvelle liste — Olva" };

// « Créer une liste » : toujours une NOUVELLE liste (décision 044). Elle est enregistrée
// en brouillon au premier choix de recette et apparaît alors dans « Mes listes en cours ».
export default function NewListPage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <StepHeader step={1} title="Nouvelle liste" subtitle="Recettes" />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Picker />
      </Suspense>
    </main>
  );
}

async function Picker() {
  const [profile, recipes, collections] = await Promise.all([
    getCurrentProfile(),
    listMyRecipes({}),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");

  return (
    <RecipePicker
      recipes={recipes} // déjà par ordre alphabétique (listMyRecipes)
      collections={collections}
      initialListId={null}
      initialSelected={[]}
      defaultServings={profile.default_servings}
    />
  );
}
