"use client";

import { Check, Flag } from "lucide-react";
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
import { cn } from "@/lib/utils";

/**
 * « Terminer les courses » (US-CRS-03, décision 070), avec confirmation. S'il reste des
 * articles non cochés, une case (cochée par défaut) crée une nouvelle liste avec eux.
 * En ligne seulement, et une fois les coches faites hors ligne envoyées : la nouvelle
 * liste doit tenir compte de TOUTES les coches.
 */
export function FinishShopping({
  listId,
  unchecked,
  ownerName,
  blockedReason,
}: {
  listId: string;
  unchecked: number;
  ownerName: string | null; // liste qu'on me partage : son créateur reçoit la nouvelle liste
  blockedReason: string | null; // hors ligne, coches en attente… (bouton désactivé)
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [carryOver, setCarryOver] = useState(true);
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
          {unchecked > 0 && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={carryOver}
                onChange={(e) => setCarryOver(e.target.checked)}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                  "peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]",
                  carryOver
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40",
                )}
              >
                {carryOver && <Check className="size-4" strokeWidth={3} />}
              </span>
              <span className="text-sm">Créer une nouvelle liste avec les articles restants</span>
            </label>
          )}
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
                  const result = await finishShopping(listId, carryOver).catch(() => null);
                  if (!result?.ok) return setFailed(true);
                  // Nouvelle liste créée : on l'ouvre ; sinon, le récapitulatif de celle-ci
                  router.push(`/listes/${result.newListId ?? listId}`);
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
