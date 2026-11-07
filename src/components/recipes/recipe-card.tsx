"use client";

import Link from "next/link";
import { ChefHat, Pencil, Share2, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { CardActionsMenu } from "@/components/cards/card-actions-menu";
import { SwipeableRow } from "@/components/cards/swipeable-row";
import type { RecipeSummary } from "@/lib/recipes";

/**
 * Carte d'une recette dans la liste : miniature, titre, personnes, collections.
 * Mes recettes : Modifier / Supprimer par le menu ⋯ (ordinateur) ou le glissement (mobile).
 * Recettes qu'on me partage : « Partagé par … », en lecture seule.
 */
export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editHref = `/recettes/${recipe.id}/modifier`;

  // Recette qu'on me partage : lecture seule, ni menu ⋯ ni glissement
  if (recipe.sharedBy) {
    return (
      <div className="bg-card hover:bg-accent rounded-xl border shadow-sm transition-colors">
        <RecipeCardLink recipe={recipe} />
      </div>
    );
  }

  return (
    <>
      <SwipeableRow
        primary={{ label: "Modifier", Icon: Pencil, href: editHref }}
        onDelete={() => setConfirmDelete(true)}
      >
        <div className="group bg-card hover:bg-accent flex items-center gap-1 rounded-xl border pr-2 shadow-sm transition-colors">
          <RecipeCardLink recipe={recipe} />
          <CardActionsMenu
            label={`Actions pour « ${recipe.title} »`}
            actions={[
              { label: "Modifier", Icon: Pencil, href: editHref },
              {
                label: "Supprimer",
                Icon: Trash2,
                onClick: () => setConfirmDelete(true),
                destructive: true,
              },
            ]}
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

/** Contenu cliquable de la carte (miniature, titre, personnes, collections). */
function RecipeCardLink({ recipe }: { recipe: RecipeSummary }) {
  return (
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
            <span className="bg-muted text-foreground ml-2 rounded px-1.5 text-xs">Exemple</span>
          )}
        </p>
        {recipe.sharedBy && (
          <p className="text-muted-foreground flex items-center gap-1 text-sm">
            <Share2 className="size-4" aria-hidden="true" />
            Partagé par {recipe.sharedBy}
          </p>
        )}
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
  );
}
