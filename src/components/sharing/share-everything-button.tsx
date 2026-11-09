"use client";

import { BookOpen, Users } from "lucide-react";
import { useState } from "react";

import { ShareDialog } from "@/components/sharing/share-dialog";
import { Button } from "@/components/ui/button";

/**
 * Paramètres → Mes partages (décision 076).
 * - « Partager mes recettes automatiquement » : toute ma bibliothèque, y compris les
 *   recettes futures, en lecture (même partage que « Partager » dans Mes recettes).
 * - « Tout partager automatiquement » : bibliothèque ET nouvelles listes, en un seul
 *   lien ou un seul email ; deux partages sont créés, retirables séparément.
 */
export function ShareRecipesAutoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <BookOpen />
        Partager mes recettes automatiquement
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

export function ShareEverythingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Users />
        Tout partager automatiquement
      </Button>
      <ShareDialog
        target={{ kind: "everything" }}
        title="Tout partager"
        description="La personne pourra consulter toutes vos recettes (y compris les futures), sans les modifier, et chaque liste que vous terminerez lui sera partagée en co-édition."
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
