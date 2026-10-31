"use client";

import { useState, useTransition } from "react";

import { deleteRecipeFromList } from "@/app/(app)/recettes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Fenêtre « Supprimer cette recette ? » : rien n'est supprimé sans confirmation. */
export function DeleteRecipeDialog({
  recipeId,
  recipeTitle,
  open,
  onOpenChange,
}: {
  recipeId: string;
  recipeTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function confirm() {
    startTransition(async () => {
      const { ok } = await deleteRecipeFromList(recipeId);
      if (ok) onOpenChange(false);
      else setFailed(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer cette recette ?</DialogTitle>
          <DialogDescription>
            « {recipeTitle} » sera supprimée définitivement, avec sa photo.
          </DialogDescription>
        </DialogHeader>
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            La suppression a échoué. Réessayez.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
