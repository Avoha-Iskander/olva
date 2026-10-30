"use client";

import { useActionState, useState } from "react";

import { type DeleteAccountState, deleteAccount } from "@/app/(app)/parametres/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";

/**
 * Zone « Supprimer mon compte ». Deux sécurités contre les erreurs :
 * il faut d'abord ouvrir la zone, puis taper SUPPRIMER pour activer le bouton.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccount,
    {},
  );

  if (!open) {
    return (
      <Button variant="outline" className="justify-self-start" onClick={() => setOpen(true)}>
        Supprimer mon compte…
      </Button>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
        <p className="font-medium">Cette action est définitive.</p>
        <p>
          Votre compte, vos recettes, vos listes et vos partages seront effacés. Les personnes avec
          qui vous partagez perdront l&apos;accès.
        </p>
      </div>
      <FormField
        label="Tapez SUPPRIMER pour confirmer"
        name="confirmation"
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
      />
      <FormMessage message={state.message} />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="destructive"
          disabled={typed.trim() !== "SUPPRIMER" || pending}
        >
          {pending ? "Suppression…" : "Supprimer définitivement"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
