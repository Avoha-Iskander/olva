import { redirect } from "next/navigation";
import { Suspense } from "react";

import { RecipePicker } from "@/components/lists/recipe-picker";
import { getCurrentDraft } from "@/lib/lists";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Nouvelle liste — Olva" };

// Étape 1 de « Nouvelle liste » (US-LST-01) : choisir les recettes et leurs portions.
export default function NewListPage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Nouvelle liste</h1>
        <p className="text-muted-foreground text-sm">Étape 1 sur 3 · Recettes</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Picker />
      </Suspense>
    </main>
  );
}

async function Picker() {
  // Lectures en parallèle : profil, brouillon en cours, recettes (miennes + partagées), collections
  const [profile, draft, recipes, collections] = await Promise.all([
    getCurrentProfile(),
    getCurrentDraft(),
    listMyRecipes({}),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");

  return (
    <RecipePicker
      recipes={[...recipes].sort((a, b) => a.title.localeCompare(b.title, "fr"))}
      collections={collections}
      initialListId={draft?.id ?? null}
      initialSelected={draft?.recipes ?? []}
      defaultServings={profile.default_servings}
    />
  );
}
