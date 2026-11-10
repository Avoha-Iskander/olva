"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useState } from "react";

import { CollectionFilter } from "@/components/recipes/collection-filter";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import type { RecipeSummary } from "@/lib/recipes";

/**
 * Mes recettes : filtre par collection et liste (US-REC-04, décision 079).
 * Toutes les recettes (de la recherche en cours) arrivent une fois du serveur ; le filtre
 * par collection les trie ici, dans le navigateur. L'adresse (?collection=…) est mise à
 * jour pour que le bouton « retour » et le rechargement gardent le filtre.
 */
export function RecipeBrowser({
  recipes,
  collections,
  initialCollectionId,
  searching,
}: {
  recipes: RecipeSummary[];
  collections: { id: string; name: string }[];
  initialCollectionId: string | null;
  searching: boolean; // une recherche est en cours (?q=…)
}) {
  // Une collection supprimée entre-temps : on revient à « Toutes »
  const [collectionId, setCollectionId] = useState(
    collections.some((c) => c.id === initialCollectionId) ? initialCollectionId : null,
  );

  function choose(id: string | null) {
    setCollectionId(id);
    // Mettre l'adresse à jour sans recharger la page (Next.js suit cette API du navigateur)
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("collection", id);
    else params.delete("collection");
    const query = params.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
  }

  const visible = collectionId
    ? recipes.filter((r) => r.collections.some((c) => c.id === collectionId))
    : recipes;

  if (recipes.length === 0 && !searching) return <EmptyState />;

  return (
    <>
      <CollectionFilter collections={collections} activeId={collectionId} onChange={choose} />
      {visible.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          Aucune recette ne correspond à votre recherche.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {visible.length} recette{visible.length > 1 ? "s" : ""}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {visible.map((recipe) => (
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
