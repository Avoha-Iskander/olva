"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

import { ShareDialog } from "@/components/sharing/share-dialog";
import { Button } from "@/components/ui/button";

/**
 * Partage des menus en co-édition (US-MEN-06, décision 077), comme les listes :
 * - ShareMenuButton : un menu, depuis sa fiche (réservé à son créateur) ;
 * - ShareAutoMenusButton : mes menus, y compris ceux que je créerai ensuite
 *   (« Partager » de la page Menus et Paramètres → Mes partages).
 * La personne peut ajouter ou retirer des recettes, changer les portions et créer
 * sa propre liste de courses ; les recettes du menu lui deviennent lisibles.
 */
export function ShareMenuButton({ menuId, menuName }: { menuId: string; menuName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Share2 />
        Partager
      </Button>
      <ShareDialog
        target={{ kind: "menu", menuId }}
        title={`Partager « ${menuName} »`}
        description="La personne pourra ajouter ou retirer des recettes, changer les portions et créer sa liste de courses. Elle verra les recettes de ce menu."
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function ShareAutoMenusButton({
  label = "Partager mes nouveaux menus automatiquement",
}: {
  label?: string; // « Partager » dans l'en-tête de la page Menus
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Share2 />
        {label}
      </Button>
      <ShareDialog
        target={{ kind: "auto_menus" }}
        title="Partager mes menus"
        description="Chaque menu que vous créerez sera partagé automatiquement, en co-édition, avec cette personne. Elle verra les recettes de ces menus."
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
