"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BookOpen, Pencil, Trash2 } from "lucide-react";

import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { Button } from "@/components/ui/button";
import { ServingsStepper } from "@/components/ui/servings-stepper";
import type { RecipeForEdit } from "@/lib/recipes";
import { scaleIngredients } from "@/lib/servings";
import { formatQuantity } from "@/lib/units";

/**
 * Fiche recette. Composant « client » : il garde en mémoire (useState) le nombre de
 * personnes choisi et recalcule les quantités à chaque clic, sans recharger la page.
 * La recette enregistrée n'est jamais modifiée : le sélecteur sert à consulter.
 */
export function RecipeView({
  recipe,
  defaultServings,
}: {
  recipe: RecipeForEdit;
  defaultServings: number; // portions par défaut du profil (point de départ du sélecteur)
}) {
  const router = useRouter();
  const [servings, setServings] = useState(defaultServings);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Recalculé à chaque rendu : la liste est courte, inutile de mémoriser le résultat
  const ingredients = scaleIngredients(recipe.ingredients, recipe.servings, servings);

  return (
    <article className="grid gap-6">
      <Link
        href="/recettes"
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Mes recettes
      </Link>

      {recipe.photoUrl && (
        // Photo privée servie par un lien temporaire : balise img simple
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.photoUrl}
          alt=""
          className="aspect-video max-h-96 w-full rounded-xl object-cover"
        />
      )}

      <header className="grid gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {recipe.title}
        </h1>
        {(recipe.bookTitle || recipe.bookPage) && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <BookOpen className="size-4 shrink-0" />
            {[recipe.bookTitle, recipe.bookPage && `p. ${recipe.bookPage}`]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
        {recipe.collections.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Collections">
            {recipe.collections.map((c) => (
              <li
                key={c.id}
                className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
              >
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* Ordinateur : ingrédients à gauche, étapes à droite. Mobile : l'un sous l'autre. */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="grid content-start gap-4" aria-labelledby="ingredients-title">
          <h2 id="ingredients-title" className="text-lg font-semibold">
            Ingrédients
          </h2>
          <div className="grid gap-1">
            <ServingsStepper
              defaultValue={servings}
              max={50}
              label="Nombre de personnes"
              onValueChange={setServings}
            />
            {servings !== recipe.servings && (
              <p className="text-muted-foreground text-sm">
                Recette prévue pour {recipe.servings} pers.
              </p>
            )}
          </div>
          {ingredients.length === 0 ? (
            <p className="text-muted-foreground">Aucun ingrédient renseigné.</p>
          ) : (
            <ul className="divide-border divide-y">
              {ingredients.map((ingredient, index) => (
                <li key={index} className="flex gap-3 py-2.5">
                  <span className="w-28 shrink-0 font-medium tabular-nums">
                    {ingredient.quantity !== null && ingredient.unit
                      ? formatQuantity(ingredient.quantity, ingredient.unit)
                      : ""}
                  </span>
                  <span>
                    {ingredient.itemName}
                    {ingredient.quantity === null && (
                      <span className="text-muted-foreground"> — au goût</span>
                    )}
                    {ingredient.note && (
                      <span className="text-muted-foreground">, {ingredient.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid content-start gap-4" aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-lg font-semibold">
            Étapes
          </h2>
          {recipe.steps.length === 0 ? (
            <p className="text-muted-foreground">Aucune étape renseignée.</p>
          ) : (
            <ol className="grid gap-4">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span
                    className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  {/* whitespace-pre-line : garde les retours à la ligne saisis dans l'étape */}
                  <p className="pt-0.5 whitespace-pre-line">{step}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-3 border-t pt-6">
        <Button asChild>
          <Link href={`/recettes/${recipe.id}/modifier`}>
            <Pencil />
            Modifier
          </Link>
        </Button>
        <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 />
          Supprimer
        </Button>
      </div>

      <DeleteRecipeDialog
        recipeId={recipe.id}
        recipeTitle={recipe.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.replace("/recettes")}
      />
    </article>
  );
}
