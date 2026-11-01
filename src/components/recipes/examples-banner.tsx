"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";

import { deleteExamples } from "@/app/(app)/recettes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Bandeau affiché tant qu'il reste des recettes d'exemple, avec le bouton
 * « Supprimer les exemples » (toujours confirmé).
 */
export function ExamplesBanner() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function confirm() {
    startTransition(async () => {
      const { ok } = await deleteExamples();
      // En cas de succès, la liste se recharge et le bandeau disparaît de lui-même
      if (ok) setOpen(false);
      else setFailed(true);
    });
  }

  return (
    <div className="bg-secondary text-secondary-foreground flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3">
      <Sparkles className="size-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        Ces recettes d&apos;exemple vous montrent comment fonctionne Olva.
      </p>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Supprimer les exemples
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer les exemples ?</DialogTitle>
            <DialogDescription>
              Les recettes marquées « Exemple » seront supprimées. Vos propres recettes, et les
              exemples que vous avez modifiés, sont conservés.
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
    </div>
  );
}
