import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PhotoImport } from "@/components/recipe-import/photo-import";
import { selectableModels } from "@/lib/ai/models";
import { getCatalogue } from "@/lib/catalogue";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections } from "@/lib/recipes";

export const metadata = { title: "Recette depuis une photo — Olva" };

/** Écran « Depuis une photo » (US-REC-02) : capture des pages, lecture, brouillon. */
export default function ImportRecipePage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Recette depuis une photo</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ImportScreen />
      </Suspense>
    </main>
  );
}

async function ImportScreen() {
  // Tout ce dont le brouillon aura besoin est chargé d'avance, comme pour « Nouvelle recette »
  const [profile, catalogue, collections] = await Promise.all([
    getCurrentProfile(),
    getCatalogue(),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");

  return (
    <PhotoImport
      userId={profile.id}
      defaultServings={profile.default_servings}
      items={catalogue.items}
      aisles={catalogue.aisles}
      collections={collections}
      models={selectableModels()} // aperçus seulement : vide en production
    />
  );
}
