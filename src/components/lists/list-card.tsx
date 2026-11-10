"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, Combine, LogOut, Share2, ShoppingBasket, Trash2, Users } from "lucide-react";

import { deleteList, leaveList } from "@/app/(app)/listes/actions";
import { CardActionsMenu } from "@/components/cards/card-actions-menu";
import { SwipeableRow } from "@/components/cards/swipeable-row";
import { MergeListDialog, type MergeTarget } from "@/components/lists/merge-list-dialog";
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
import { listTitle } from "@/lib/list-title";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ListStatus, string> = {
  draft: "Brouillon",
  ready: "Prête",
  shopping: "Courses en cours",
  done: "Terminée",
};

/**
 * Carte de « Mes listes » : ouvrir la liste ; la supprimer (ma liste) ou y renoncer
 * (liste qu'on me partage), avec confirmation (US-LST-09) ; la verser dans une autre
 * (ma liste prête ou en courses, US-LST-10).
 * Ordinateur : menu ⋯ ; mobile : glissement à gauche, comme Mes recettes.
 */
export function ListCard({
  href,
  status,
  name,
  sharedWith,
  createdAt,
  recipeTitles,
  itemCount,
  listId,
  sharedBy,
  detail,
  mergeTargets,
}: {
  href: string;
  status: ListStatus;
  name: string | null; // nom choisi (US-LST-11)
  sharedWith: string[]; // ma liste : personnes avec qui je la partage
  createdAt: string;
  recipeTitles: string[];
  itemCount: number;
  listId: string;
  sharedBy: string | null; // liste qu'on me partage : je peux seulement y renoncer
  detail?: string; // remplace la ligne « recettes · articles » (ex. historique)
  /** Listes où verser celle-ci ; absent : pas de « Verser » (brouillon, terminée, partagée). */
  mergeTargets?: MergeTarget[];
}) {
  const [merging, setMerging] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const title = listTitle(createdAt, name);
  // Ma liste : Supprimer ; liste partagée avec moi : Renoncer
  const leave = sharedBy !== null;
  const actionLabel = leave ? "Renoncer" : "Supprimer";
  const canMerge = !leave && mergeTargets !== undefined;
  const mergeAction = { label: "Verser", Icon: Combine, onClick: () => setMerging(true) };

  return (
    <>
      <SwipeableRow
        primary={canMerge ? mergeAction : undefined}
        deleteLabel={actionLabel}
        onDelete={() => setConfirm(true)}
      >
        <div className="group bg-card hover:bg-accent flex items-center gap-1 rounded-xl border pr-2 shadow-sm transition-colors">
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
              {sharedBy && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Share2 className="size-3" aria-hidden="true" />
                  Partagée par {sharedBy}
                </span>
              )}
              {sharedWith.length > 0 && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Users className="size-3" aria-hidden="true" />
                  Partagée avec {sharedWith.join(", ")}
                </span>
              )}
              <span className="text-muted-foreground truncate text-sm">
                {detail ?? (
                  <>
                    {recipeTitles.length ? recipeTitles.join(", ") : "Aucune recette"}
                    {itemCount > 0 && ` · ${itemCount} article${itemCount > 1 ? "s" : ""}`}
                  </>
                )}
              </span>
            </span>
            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          </Link>
          <CardActionsMenu
            label={`Actions pour « ${title} »`}
            actions={[
              ...(canMerge ? [{ ...mergeAction, label: "Verser…" }] : []),
              {
                label: actionLabel,
                Icon: leave ? LogOut : Trash2,
                onClick: () => setConfirm(true),
                destructive: true,
              },
            ]}
          />
        </div>
      </SwipeableRow>

      {canMerge && (
        <MergeListDialog
          sourceId={listId}
          targets={mergeTargets}
          open={merging}
          onOpenChange={setMerging}
        />
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {leave ? "Renoncer à cette liste ?" : "Supprimer cette liste ?"}
            </DialogTitle>
            <DialogDescription>
              {leave
                ? `Vous ne verrez plus « ${title} ». Elle reste à ${sharedBy}.`
                : `${title} sera supprimée définitivement. Vos recettes ne sont pas touchées.`}
            </DialogDescription>
          </DialogHeader>
          {failed && (
            <p role="alert" className="text-destructive text-sm">
              L&apos;opération a échoué. Réessayez.
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
                  const { ok } = await (leave ? leaveList(listId) : deleteList(listId));
                  if (ok) setConfirm(false);
                  else setFailed(true);
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
