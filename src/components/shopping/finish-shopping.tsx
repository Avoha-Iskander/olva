"use client";

import { ArrowRight, Flag, ShoppingCart, type LucideIcon } from "lucide-react";
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
import { uncheckedSummary } from "@/lib/carryover";
import { cn } from "@/lib/utils";

/**
 * « Terminer les courses » (US-CRS-03, décision 080), avec confirmation.
 * - Tout est coché : « Terminer les courses ? », Annuler / Terminer.
 * - Il reste des articles : « ⚠️ N articles non cochés » et trois choix, chacun avec un
 *   sous-titre : Nouvelle liste (avec les restes), Terminer (sans les garder), Continuer.
 * En ligne seulement, et une fois les coches faites hors ligne envoyées : la nouvelle
 * liste doit tenir compte de TOUTES les coches.
 */
export function FinishShopping({
  listId,
  uncheckedNames,
  ownerName,
  blockedReason,
}: {
  listId: string;
  uncheckedNames: string[]; // articles pas encore cochés
  ownerName: string | null; // liste qu'on me partage : son créateur reçoit la nouvelle liste
  blockedReason: string | null; // hors ligne, coches en attente… (bouton désactivé)
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const unchecked = uncheckedNames.length;

  /** Termine la liste ; avec `carryOver`, crée la nouvelle liste des restes et l'ouvre. */
  function finish(carryOver: boolean) {
    startTransition(async () => {
      setFailed(false);
      const result = await finishShopping(listId, carryOver).catch(() => null);
      if (!result?.ok) return setFailed(true);
      // Nouvelle liste créée : on l'ouvre ; sinon, le récapitulatif de celle-ci
      router.push(`/listes/${result.newListId ?? listId}`);
    });
  }

  const error = failed && (
    <p role="alert" className="text-destructive text-sm">
      L&apos;opération a échoué. Vérifiez votre connexion et réessayez.
    </p>
  );

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
          {unchecked === 0 ? (
            <>
              <DialogHeader>
                <DialogTitle>Terminer les courses ?</DialogTitle>
                <DialogDescription>
                  Tous les articles sont dans le panier. La liste passera dans l&apos;historique.
                </DialogDescription>
              </DialogHeader>
              {error}
              <div className="flex flex-wrap justify-end gap-3">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" disabled={pending}>
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="button" disabled={pending} onClick={() => finish(false)}>
                  {pending ? "Enregistrement…" : "Terminer"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  ⚠️ {unchecked} article{unchecked > 1 ? "s" : ""} non coché
                  {unchecked > 1 ? "s" : ""}
                </DialogTitle>
                <DialogDescription>
                  {uncheckedSummary(uncheckedNames)}
                  {ownerName && ` · La nouvelle liste sera à ${ownerName}.`}
                </DialogDescription>
              </DialogHeader>
              {error}
              <div className="grid gap-2">
                <Choice
                  primary
                  Icon={ArrowRight}
                  title="Nouvelle liste"
                  subtitle="avec les articles restants"
                  disabled={pending}
                  onClick={() => finish(true)}
                />
                <Choice
                  Icon={Flag}
                  title="Terminer"
                  subtitle="sans les garder"
                  disabled={pending}
                  onClick={() => finish(false)}
                />
                <Choice
                  Icon={ShoppingCart}
                  title="Continuer"
                  subtitle="revenir aux courses"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Un des trois choix : titre court en gras, précision dessous ; toute la ligne se touche. */
function Choice({
  Icon,
  title,
  subtitle,
  primary = false,
  disabled,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  primary?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50",
        primary
          ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
          : "hover:bg-accent",
      )}
    >
      <Icon
        className={cn("size-5 shrink-0", !primary && "text-muted-foreground")}
        aria-hidden="true"
      />
      <span className="grid">
        <span className="font-medium">{title}</span>
        <span className={cn("text-xs", !primary && "text-muted-foreground")}>{subtitle}</span>
      </span>
    </button>
  );
}
