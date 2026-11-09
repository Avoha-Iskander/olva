"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, Copy, Trash2, UtensilsCrossed } from "lucide-react";

import { deleteMenu, duplicateMenu, leaveMenu } from "@/app/(app)/menus/actions";
import { CardActionsMenu } from "@/components/cards/card-actions-menu";
import { SwipeableRow } from "@/components/cards/swipeable-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MenuSummary } from "@/lib/menus";

/** Ce que la liste du menu est devenue, en quelques mots. */
function listLabel(list: MenuSummary["list"]): string | null {
  if (!list) return null;
  if (list.status === "draft") return "Liste en préparation";
  if (list.status === "done") return "Courses terminées";
  return "Liste prête";
}

/**
 * Carte de « Mes menus » (US-MEN-04) : ouvrir le menu, le dupliquer ou le supprimer.
 * Ordinateur : menu ⋯ ; mobile : glissement à gauche (Dupliquer en bleu, Supprimer en rouge).
 */
export function MenuCard({ menu }: { menu: MenuSummary }) {
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState<null | "delete" | "duplicate">(null);
  const [pending, startTransition] = useTransition();
  const status = listLabel(menu.list);
  const count = menu.recipeTitles.length;
  // Mon menu : Supprimer ; menu partagé avec moi : Renoncer (comme les listes)
  const leave = menu.sharedBy !== null;
  const actionLabel = leave ? "Renoncer" : "Supprimer";

  function duplicate() {
    startTransition(async () => {
      // En cas de succès, l'action ouvre le nouveau menu (redirection)
      const result = await duplicateMenu(menu.id);
      if (!result.ok) setFailed("duplicate");
    });
  }

  return (
    <>
      <SwipeableRow
        primary={{ label: "Dupliquer", Icon: Copy, onClick: duplicate }}
        onDelete={() => setConfirm(true)}
        deleteLabel={actionLabel}
      >
        <div className="group bg-card hover:bg-accent flex items-center gap-1 rounded-xl border pr-2 shadow-sm transition-colors">
          <Link href={`/menus/${menu.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3">
            <span className="bg-secondary flex size-12 shrink-0 items-center justify-center rounded-lg">
              <UtensilsCrossed className="text-secondary-foreground/70 size-6" aria-hidden="true" />
            </span>
            <span className="grid min-w-0 flex-1 gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{menu.name}</span>
                {status && (
                  <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-xs">
                    {status}
                  </span>
                )}
                {menu.sharedBy && (
                  <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-xs">
                    Partagé par {menu.sharedBy}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground truncate text-sm">
                {count
                  ? `${count} recette${count > 1 ? "s" : ""} · ${menu.recipeTitles.join(", ")}`
                  : "Aucune recette"}
              </span>
            </span>
            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          </Link>
          <CardActionsMenu
            label={`Actions pour « ${menu.name} »`}
            actions={[
              { label: "Dupliquer", Icon: Copy, onClick: duplicate },
              {
                label: actionLabel,
                Icon: Trash2,
                onClick: () => setConfirm(true),
                destructive: true,
              },
            ]}
          />
        </div>
      </SwipeableRow>
      {failed === "duplicate" && (
        <p role="alert" className="text-destructive mt-1 text-sm">
          Le menu n&apos;a pas pu être dupliqué. Réessayez.
        </p>
      )}
      {pending && failed !== "delete" && !confirm && (
        <p role="status" className="text-muted-foreground mt-1 text-sm">
          Duplication…
        </p>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{leave ? "Renoncer à ce menu ?" : "Supprimer ce menu ?"}</DialogTitle>
            <DialogDescription>
              {leave ? (
                <>
                  Vous ne verrez plus « {menu.name} ». Il reste à {menu.sharedBy}.
                </>
              ) : (
                <>
                  « {menu.name} » sera supprimé définitivement.
                  {menu.list ? " Sa liste de courses est gardée." : ""} Vos recettes ne sont pas
                  touchées.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {failed === "delete" && (
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
                  const { ok } = leave ? await leaveMenu(menu.id) : await deleteMenu(menu.id);
                  if (ok) setConfirm(false);
                  else setFailed("delete");
                })
              }
            >
              {pending ? "Un instant…" : actionLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
