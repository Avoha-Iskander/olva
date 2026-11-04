"use client";

import { useTransition } from "react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { clearOfflineData } from "@/lib/offline-store";

/**
 * « Se déconnecter » : avant de fermer la session, on efface ce que le téléphone garde
 * pour le hors ligne (listes, coches en attente, pages en cache). Rien de mes listes ne
 * doit rester sur un téléphone prêté ou partagé.
 */
export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearOfflineData();
          navigator.serviceWorker?.controller?.postMessage("effacer-cache");
          await signOut();
        })
      }
    >
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  );
}
