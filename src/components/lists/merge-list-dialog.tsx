"use client";

import { useState, useTransition } from "react";
import { Combine, Share2, ShoppingBasket } from "lucide-react";

import { mergeListInto } from "@/app/(app)/listes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listTitle } from "@/lib/list-title";
import { cn } from "@/lib/utils";

/** Une liste qui peut recevoir les articles (prête ou en courses). */
export type MergeTarget = {
  id: string;
  name: string | null;
  createdAt: string;
  sharedBy: string | null;
};

/**
 * « Verser dans une autre liste » (US-LST-10) : choisir la liste d'arrivée, puis confirmer.
 * Les articles non cochés y sont ajoutés, et cette liste-ci est supprimée.
 */
export function MergeListDialog({
  sourceId,
  targets,
  open,
  onOpenChange,
}: {
  sourceId: string;
  targets: MergeTarget[]; // sans la liste de départ
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verser dans une autre liste</DialogTitle>
          <DialogDescription>
            Les articles pas encore cochés rejoignent la liste choisie, puis cette liste est
            supprimée.
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune autre liste prête : terminez d&apos;abord la préparation d&apos;une liste.
          </p>
        ) : (
          <ul className="grid gap-2" role="radiogroup" aria-label="Liste d'arrivée">
            {targets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chosen === t.id}
                  data-list-id={t.id} // repère pour les tests (deux listes du même jour ont le même nom)
                  onClick={() => setChosen(t.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    chosen === t.id ? "border-primary bg-secondary" : "hover:bg-accent",
                  )}
                >
                  <ShoppingBasket className="text-primary size-5 shrink-0" aria-hidden="true" />
                  <span className="grid min-w-0">
                    <span className="font-medium first-letter:uppercase">
                      {listTitle(t.createdAt, t.name)}
                    </span>
                    {t.sharedBy && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Share2 className="size-3" aria-hidden="true" />
                        Partagée par {t.sharedBy}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {failed && (
          <p role="alert" className="text-destructive text-sm">
            La liste n&apos;a pas pu être versée. Réessayez.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!chosen || pending}
            onClick={() =>
              chosen &&
              startTransition(async () => {
                // En cas de succès, l'action ouvre la liste d'arrivée (redirection)
                const result = await mergeListInto(sourceId, chosen);
                if (!result.ok) setFailed(true);
              })
            }
          >
            {pending ? "Un instant…" : "Verser"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Bouton « Verser… » de la page d'une liste (US-LST-10). */
export function MergeListButton({
  sourceId,
  targets,
}: {
  sourceId: string;
  targets: MergeTarget[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Combine />
        Verser…
      </Button>
      <MergeListDialog sourceId={sourceId} targets={targets} open={open} onOpenChange={setOpen} />
    </>
  );
}
