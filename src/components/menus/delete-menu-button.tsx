"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteMenu } from "@/app/(app)/menus/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** « Supprimer le menu… » en bas de la page du menu, avec confirmation (US-MEN-04). */
export function DeleteMenuButton({ menuId, hasList }: { menuId: string; hasList: boolean }) {
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-destructive w-fit">
          <Trash2 />
          Supprimer le menu…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce menu ?</DialogTitle>
          <DialogDescription>
            Le menu sera supprimé définitivement.
            {hasList ? " Sa liste de courses est gardée." : ""} Vos recettes ne sont pas touchées.
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
                const { ok } = await deleteMenu(menuId);
                if (ok) router.push("/menus");
                else setFailed(true);
              })
            }
          >
            {pending ? "Suppression…" : "Oui, supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
