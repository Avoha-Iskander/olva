import { Suspense } from "react";

import { AddRecipeMenu } from "@/components/recipes/add-recipe-menu";
import { ExamplesBanner } from "@/components/recipes/examples-banner";
import { RecipeBrowser } from "@/components/recipes/recipe-browser";
import { RecipeSearch } from "@/components/recipes/recipe-search";
import { ShareLibraryButton } from "@/components/sharing/share-library-button";
import { hasExamples, listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Mes recettes — Olva" };

export default function RecipesPage({ searchParams }: PageProps<"/recettes">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      {/* Mobile : boutons sous le titre ; ordinateur : sur la même ligne (décision 076) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Mes recettes</h1>
        <div className="flex flex-wrap gap-2">
          <ShareLibraryButton />
          <AddRecipeMenu />
        </div>
      </div>
      <Suspense fallback={<div className="h-11" />}>
        <RecipeSearch />
      </Suspense>
      <Suspense fallback={<RecipeListSkeleton />}>
        <RecipeResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function RecipeResults({
  searchParams,
}: {
  searchParams: PageProps<"/recettes">["searchParams"];
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : undefined;
  const collectionId = typeof params.collection === "string" ? params.collection : null;

  // Toutes les recettes de la recherche : le filtre par collection se fait ensuite dans le
  // navigateur, sans recharger la page (décision 079)
  const [recipes, collections, showExamplesBanner] = await Promise.all([
    listMyRecipes({ search }),
    listMyCollections(),
    hasExamples(),
  ]);

  return (
    <>
      {showExamplesBanner && <ExamplesBanner />}
      <RecipeBrowser
        recipes={recipes}
        collections={collections}
        initialCollectionId={collectionId}
        searching={Boolean(search)}
      />
    </>
  );
}

function RecipeListSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="bg-muted h-[104px] animate-pulse rounded-xl" />
      ))}
    </ul>
  );
}
