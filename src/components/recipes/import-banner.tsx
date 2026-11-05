"use client";

import { CheckCircle2, Info, Pencil, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteRecipe } from "@/app/(app)/recettes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Bandeau en haut de la fiche, juste après un import (décision 060) :
 * - « importée » : la recette vient d'être enregistrée sans brouillon. On rappelle les
 *   articles choisis par l'IA sans correspondance évidente, et on permet de modifier ou
 *   d'annuler l'import (suppression, après confirmation) ;
 * - « déjà importée » : le lien collé l'avait déjà été, voici la recette existante.
 * Il n'apparaît qu'à l'arrivée sur la fiche (paramètre dans l'adresse), pas ensuite.
 */
export function ImportBanner({
  recipeId,
  kind,
  proposedNames,
}: {
  recipeId: string;
  kind: "imported" | "already";
  proposedNames: string[];
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (kind === "already") {
    return (
      <Card role="status" className="mb-4">
        <CardContent className="flex items-start gap-3">
          <Info className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">Vous aviez déjà importé cette recette : la voici.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card role="status" className="mb-4">
      <CardContent className="grid gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">
            <span className="font-medium">Recette importée.</span> Modifiez-la si quelque chose ne
            vous convient pas.
          </p>
        </div>

        {proposedNames.length > 0 && (
          <div className="text-muted-foreground flex items-start gap-3 text-sm">
            <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p>
              {proposedNames.length > 1 ? "Articles proposés" : "Article proposé"} par l&apos;IA :{" "}
              {proposedNames.join(", ")}.
            </p>
          </div>
        )}

        {confirming ? (
          <div className="grid gap-2">
            <p className="text-sm">Supprimer cette recette ? Cette action est irréversible.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => startTransition(() => deleteRecipe(recipeId))}
              >
                Oui, supprimer
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Garder la recette
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/recettes/${recipeId}/modifier`}>
                <Pencil />
                Modifier
              </Link>
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
              <Trash2 />
              Annuler l&apos;import
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
