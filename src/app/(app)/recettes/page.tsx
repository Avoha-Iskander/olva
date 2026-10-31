import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Suspense } from "react";

import { CollectionFilter } from "@/components/recipes/collection-filter";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeSearch } from "@/components/recipes/recipe-search";
import { Button } from "@/components/ui/button";
import { listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Mes recettes — Olva" };

export default function RecipesPage({ searchParams }: PageProps<"/recettes">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Mes recettes</h1>
        <Button asChild>
          <Link href="/recettes/nouvelle">
            <Plus />
            <span>Ajouter</span>
          </Link>
        </Button>
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
  const collectionId = typeof params.collection === "string" ? params.collection : undefined;

  const [recipes, collections] = await Promise.all([
    listMyRecipes({ search, collectionId }),
    listMyCollections(),
  ]);
  const hasFilter = Boolean(search || collectionId);

  return (
    <>
      <CollectionFilter collections={collections} activeId={collectionId} search={search} />
      {recipes.length === 0 ? (
        hasFilter ? (
          <p className="text-muted-foreground py-10 text-center">
            Aucune recette ne correspond à votre recherche.
          </p>
        ) : (
          <EmptyState />
        )
      ) : (
        <>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {recipes.length} recette{recipes.length > 1 ? "s" : ""}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
      <BookOpen className="text-primary size-10" aria-hidden="true" />
      <div className="grid gap-1">
        <p className="font-medium">Aucune recette pour l&apos;instant</p>
        <p className="text-muted-foreground text-sm">
          Ajoutez vos recettes préférées pour préparer vos listes de courses en 2 minutes.
        </p>
      </div>
      <Button asChild>
        <Link href="/recettes/nouvelle">Créer ma première recette</Link>
      </Button>
    </div>
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
