"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { finishShopping } from "@/app/(app)/courses/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { finishMessage } from "@/lib/carryover";

/**
 * « Terminer les courses » (US-CRS-03), avec confirmation : combien d'articles non cochés
 * seront reportés, et sur la liste de qui (le créateur, pour une liste partagée).
 * En ligne seulement, et une fois les coches faites hors ligne envoyées : le report doit
 * tenir compte de TOUTES les coches.
 */
export function FinishShopping({
  listId,
  unchecked,
  ownerName,
  blockedReason,
}: {
  listId: string;
  unchecked: number;
  ownerName: string | null; // liste qu'on me partage : son créateur reçoit le report
  blockedReason: string | null; // hors ligne, coches en attente… (bouton désactivé)
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-2 border-t pt-6">
      <Button
        type="button"
        size="lg"
        variant="outline"
        disabled={Boolean(blockedReason)}
        onClick={() => setOpen(true)}
      >
        <Flag />
        Terminer les courses
      </Button>
      {blockedReason && (
        <p className="text-muted-foreground text-center text-sm">{blockedReason}</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer les courses ?</DialogTitle>
            <DialogDescription>
              {finishMessage(unchecked, ownerName)} La liste passera dans l&apos;historique.
            </DialogDescription>
          </DialogHeader>
          {failed && (
            <p role="alert" className="text-destructive text-sm">
              L&apos;opération a échoué. Vérifiez votre connexion et réessayez.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Continuer les courses
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setFailed(false);
                  const ok = await finishShopping(listId).then(
                    (r) => r.ok,
                    () => false,
                  );
                  if (!ok) return setFailed(true);
                  router.push(`/listes/${listId}`);
                })
              }
            >
              {pending ? "Enregistrement…" : "Terminer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
