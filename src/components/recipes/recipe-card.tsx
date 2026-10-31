"use client";

import Link from "next/link";
import { ChefHat, Users } from "lucide-react";
import { useState } from "react";

import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { RecipeActionsMenu } from "@/components/recipes/recipe-actions-menu";
import { SwipeableRow } from "@/components/recipes/swipeable-row";
import type { RecipeSummary } from "@/lib/recipes";

/**
 * Carte d'une recette dans la liste : miniature, titre, personnes, collections.
 * Modifier / Supprimer : menu ⋯ au survol (ordinateur) ou glissement à gauche (mobile).
 */
export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editHref = `/recettes/${recipe.id}/modifier`;

  return (
    <>
      <SwipeableRow editHref={editHref} onDelete={() => setConfirmDelete(true)}>
        <div className="group bg-card hover:bg-accent flex items-center gap-1 rounded-xl border pr-2 shadow-sm transition-colors">
          <Link href={`/recettes/${recipe.id}`} className="flex min-w-0 flex-1 gap-3 p-3">
            <div className="bg-secondary flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg">
              {recipe.thumbUrl ? (
                // Photo privée servie par un lien temporaire : balise img simple
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipe.thumbUrl} alt="" className="size-full object-cover" />
              ) : (
                <ChefHat className="text-secondary-foreground/60 size-8" aria-hidden="true" />
              )}
            </div>
            <div className="grid min-w-0 content-start gap-1.5">
              <h2 className="truncate font-medium">{recipe.title}</h2>
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <Users className="size-4" aria-hidden="true" />
                {recipe.servings} pers.
                {recipe.isExample && (
                  <span className="bg-muted ml-2 rounded px-1.5 text-xs">exemple</span>
                )}
              </p>
              {recipe.collections.length > 0 && (
                <ul className="flex flex-wrap gap-1">
                  {recipe.collections.map((c) => (
                    <li
                      key={c.id}
                      className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs"
                    >
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Link>
          <RecipeActionsMenu
            recipeId={recipe.id}
            recipeTitle={recipe.title}
            onDelete={() => setConfirmDelete(true)}
          />
        </div>
      </SwipeableRow>
      <DeleteRecipeDialog
        recipeId={recipe.id}
        recipeTitle={recipe.title}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
      />
    </>
  );
}
