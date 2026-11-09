"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

import { ShareDialog } from "@/components/sharing/share-dialog";
import { Button } from "@/components/ui/button";

/** Bouton « Partager » d'une liste prête : co-édition (US-LST-07). */
export function ShareListButton({ listId }: { listId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Share2 />
        Partager
      </Button>
      <ShareDialog
        target={{ kind: "list", listId }}
        title="Partager cette liste"
        description="La personne pourra ajouter, retirer et modifier des articles. Vous seul pouvez supprimer la liste."
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

/** Paramètres → Mes partages : « Partager automatiquement mes nouvelles listes avec … ». */
export function ShareAutoListsButton({
  label = "Partager mes nouvelles listes automatiquement",
}: {
  label?: string; // « Partager » dans l'en-tête de Mes listes (décision 076)
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Share2 />
        {label}
      </Button>
      <ShareDialog
        target={{ kind: "auto_lists" }}
        title="Partager mes nouvelles listes"
        description="Chaque liste que vous terminerez sera partagée automatiquement, en co-édition, avec cette personne."
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
