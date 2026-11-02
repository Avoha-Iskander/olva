"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, ShoppingBasket, Trash2 } from "lucide-react";

import { deleteList } from "@/app/(app)/listes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ListStatus } from "@/lib/lists";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ListStatus, string> = {
  draft: "Brouillon",
  ready: "Prête",
  shopping: "Courses en cours",
  done: "Terminée",
};

/** « Liste du lundi 2 novembre » : une liste n'a pas de nom, on la date. */
export function listTitle(createdAt: string) {
  const date = new Date(createdAt).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris", // même date côté serveur et navigateur
  });
  return `Liste du ${date}`;
}

/** Carte de « Mes listes en cours » : ouvrir la liste, ou la supprimer (avec confirmation). */
export function ListCard({
  href,
  status,
  createdAt,
  recipeTitles,
  itemCount,
  listId,
}: {
  href: string;
  status: ListStatus;
  createdAt: string;
  recipeTitles: string[];
  itemCount: number;
  listId: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const title = listTitle(createdAt);

  return (
    <div className="bg-card hover:bg-accent flex items-center gap-1 rounded-xl border pr-2 shadow-sm transition-colors">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 p-3">
        <span className="bg-secondary flex size-12 shrink-0 items-center justify-center rounded-lg">
          <ShoppingBasket className="text-secondary-foreground/70 size-6" aria-hidden="true" />
        </span>
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium first-letter:uppercase">{title}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs",
                status === "draft"
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          </span>
          <span className="text-muted-foreground truncate text-sm">
            {recipeTitles.length ? recipeTitles.join(", ") : "Aucune recette"}
            {itemCount > 0 && ` · ${itemCount} article${itemCount > 1 ? "s" : ""}`}
          </span>
        </span>
        <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setConfirm(true)}
        aria-label={`Supprimer la ${title.charAt(0).toLowerCase()}${title.slice(1)}`}
      >
        <Trash2 />
      </Button>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette liste ?</DialogTitle>
            <DialogDescription>
              {title} sera supprimée définitivement. Vos recettes ne sont pas touchées.
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
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const { ok } = await deleteList(listId);
                  if (ok) setConfirm(false);
                  else setFailed(true);
                })
              }
            >
              {pending ? "Suppression…" : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
