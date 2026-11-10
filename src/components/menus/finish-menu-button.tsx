"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setMenuFinished } from "@/app/(app)/menus/actions";
import { Button } from "@/components/ui/button";

/**
 * « Terminer le menu » : il passe dans l'onglet « Terminés » de Mes menus, et on y
 * retourne. « Remettre en cours » fait l'inverse (US-MEN-04, décision 079).
 */
export function FinishMenuButton({ menuId, finished }: { menuId: string; finished: boolean }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-1">
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { ok } = await setMenuFinished(menuId, !finished);
            setFailed(!ok);
            if (ok) router.push(finished ? `/menus/${menuId}` : "/menus?onglet=termines");
          })
        }
      >
        {finished ? <ArchiveRestore /> : <Archive />}
        {finished ? "Remettre en cours" : "Terminer le menu"}
      </Button>
      {failed && (
        <p role="alert" className="text-destructive text-sm">
          Le menu n&apos;a pas pu être mis à jour. Réessayez.
        </p>
      )}
    </div>
  );
}
