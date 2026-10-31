import Link from "next/link";
import { ChefHat, Users } from "lucide-react";

import type { RecipeSummary } from "@/lib/recipes";

/** Carte d'une recette dans la liste : miniature, titre, personnes, collections. */
export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Link
      href={`/recettes/${recipe.id}`}
      className="bg-card hover:bg-accent flex gap-3 rounded-xl border p-3 shadow-sm transition-colors"
    >
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
  );
}
