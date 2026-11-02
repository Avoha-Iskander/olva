"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CopyPlus, ExternalLink } from "lucide-react";

import { copyRecipe } from "@/app/(app)/recettes/actions";
import { Button } from "@/components/ui/button";

/**
 * Bas de la fiche d'une recette qu'on me partage : « Copier dans mes recettes »,
 * ou un lien vers ma copie si je l'ai déjà copiée (pas de doublon).
 */
export function CopyRecipeButton({
  recipeId,
  myCopyId,
}: {
  recipeId: string;
  myCopyId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (myCopyId) {
    return (
      <div className="grid gap-2 border-t pt-6">
        <p className="text-muted-foreground text-sm">Vous en avez déjà une copie.</p>
        <Button asChild variant="outline" className="justify-self-start">
          <Link href={`/recettes/${myCopyId}`}>
            <ExternalLink />
            Voir ma copie
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2 border-t pt-6">
      <Button
        type="button"
        className="justify-self-start"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await copyRecipe(recipeId);
            // Succès : on ouvre directement la copie, que l'on peut maintenant modifier
            if (result.ok) router.push(`/recettes/${result.id}`);
            else setError(result.message);
          })
        }
      >
        <CopyPlus />
        {pending ? "Copie…" : "Copier dans mes recettes"}
      </Button>
      <p className="text-muted-foreground text-sm">
        Vous pourrez la modifier, sans toucher à l&apos;original.
      </p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
