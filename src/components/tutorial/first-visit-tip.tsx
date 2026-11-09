"use client";

import { Lightbulb, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

/**
 * Astuce affichée la première fois qu'on ouvre un écran (US-CPT-06), puis plus jamais
 * sur cet appareil. Mémorisée dans le navigateur (localStorage) : c'est un simple
 * confort, sans importance si elle réapparaît sur un autre téléphone.
 * Le navigateur peut refuser l'accès au stockage (navigation privée) : on ne fait
 * alors rien de grave, d'où les try / catch.
 */
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function wasSeen(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function FirstVisitTip({ id, children }: { id: string; children: React.ReactNode }) {
  const key = `olva:tip:${id}`;
  // useSyncExternalStore : lit une valeur extérieure à React (ici le stockage du navigateur) ;
  // côté serveur, on considère l'astuce comme déjà vue pour ne rien afficher par erreur
  const seen = useSyncExternalStore(
    subscribe,
    () => wasSeen(key),
    () => true,
  );
  if (seen) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // stockage indisponible : l'astuce reviendra, sans conséquence
    }
    listeners.forEach((listener) => listener());
  };

  return (
    <aside className="bg-secondary text-secondary-foreground flex items-start gap-3 rounded-xl p-3 text-sm">
      <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">{children}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="-m-2 size-11 shrink-0"
        aria-label="Fermer l'astuce"
        onClick={dismiss}
      >
        <X />
      </Button>
    </aside>
  );
}
