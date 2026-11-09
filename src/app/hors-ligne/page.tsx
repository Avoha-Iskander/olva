import { WifiOff } from "lucide-react";

import { GoShopping } from "./go-shopping";

export const metadata = { title: "Hors ligne — Olva" };

/**
 * Page de secours, servie par le service worker quand une page n'a jamais été ouverte
 * avec réseau sur ce téléphone. Volontairement statique : elle est mise en cache dès
 * l'installation, sans dépendre de la connexion ni de la base.
 */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <WifiOff className="text-muted-foreground size-12" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">Vous êtes hors ligne</h1>
      <p className="text-muted-foreground max-w-sm">
        Cette page n&apos;a pas encore été ouverte sur ce téléphone. Les listes de courses déjà
        ouvertes restent disponibles : retournez dans « Mes courses ».
      </p>
      <GoShopping />
    </main>
  );
}
