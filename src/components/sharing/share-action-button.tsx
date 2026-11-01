"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

/**
 * Petit bouton « Retirer », « Renoncer » ou « Annuler » d'une ligne de Mes partages.
 * L'action serveur reçue (onConfirm) fait la suppression ; la page se met à jour seule.
 */
export function ShareActionButton({
  label,
  pendingLabel,
  onConfirm,
}: {
  label: string;
  pendingLabel: string;
  onConfirm: () => Promise<{ ok: boolean }>;
}) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { ok } = await onConfirm();
            setFailed(!ok);
          })
        }
      >
        {pending ? pendingLabel : label}
      </Button>
      {failed && (
        <p role="alert" className="text-destructive text-xs">
          Échec, réessayez.
        </p>
      )}
    </div>
  );
}
