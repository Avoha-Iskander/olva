import Link from "next/link";
import { Hourglass } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Page provisoire pour une fonctionnalité prévue dans un lot suivant. */
export function ComingSoon({ title, lot }: { title: string; lot: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Hourglass className="text-primary size-10" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground max-w-sm">Bientôt disponible ({lot}).</p>
      <Button asChild variant="outline">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </main>
  );
}
