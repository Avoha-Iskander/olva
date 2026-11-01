"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

import { ShareDialog } from "@/components/sharing/share-dialog";
import { Button } from "@/components/ui/button";

/** Bouton « Partager » de Mes recettes : partage toute ma bibliothèque. */
export function ShareLibraryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Share2 />
        {/* Mobile : icône seule (le titre « Mes recettes » et « Ajouter » prennent la place) */}
        <span className="sr-only sm:not-sr-only">Partager</span>
      </Button>
      <ShareDialog
        target={{ kind: "library" }}
        title="Partager toutes mes recettes"
        description="La personne pourra consulter toutes vos recettes, y compris celles que vous ajouterez plus tard, sans les modifier. Les recettes d'exemple ne sont pas partagées."
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
