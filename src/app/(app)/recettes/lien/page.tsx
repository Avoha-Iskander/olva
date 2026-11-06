import { redirect } from "next/navigation";
import { Suspense } from "react";

import { UrlImport } from "@/components/recipe-import/url-import";
import { selectableModels } from "@/lib/ai/models";
import { getCatalogue } from "@/lib/catalogue";
import { parseListReturn } from "@/lib/list-return";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections } from "@/lib/recipes";

export const metadata = { title: "Recette depuis un lien — Olva" };

/** Écran « Depuis un lien » (US-REC-07) : adresse d'une page, lecture, brouillon. */
export default function UrlImportPage({ searchParams }: PageProps<"/recettes/lien">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Recette depuis un lien</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <UrlImportScreen searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function UrlImportScreen({
  searchParams,
}: {
  searchParams: PageProps<"/recettes/lien">["searchParams"];
}) {
  const [profile, catalogue, collections, query] = await Promise.all([
    getCurrentProfile(),
    getCatalogue(),
    listMyCollections(),
    searchParams,
  ]);
  if (!profile) redirect("/connexion");

  return (
    <UrlImport
      // Venu de l'étape 1 d'une liste : on y reviendra, recette cochée (décision 064)
      returnToList={parseListReturn(query.liste)}
      userId={profile.id}
      defaultServings={profile.default_servings}
      items={catalogue.items}
      aisles={catalogue.aisles}
      collections={collections}
      models={selectableModels()} // aperçus seulement : vide en production
    />
  );
}
