import Link from "next/link";
import { Hourglass, Pencil } from "lucide-react";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Recette — Olva" };

// Fiche recette provisoire : l'affichage complet arrive au lot 2.5.
export default function RecipePage({ params }: PageProps<"/recettes/[id]">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Hourglass className="text-primary size-10" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">Recette enregistrée</h1>
      <p className="text-muted-foreground max-w-sm">La fiche complète arrive bientôt (lot 2.5).</p>
      <Suspense fallback={null}>
        <Actions params={params} />
      </Suspense>
    </main>
  );
}

async function Actions({ params }: { params: PageProps<"/recettes/[id]">["params"] }) {
  const { id } = await params;
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button asChild>
        <Link href={`/recettes/${id}/modifier`}>
          <Pencil />
          Modifier la recette
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/recettes">Mes recettes</Link>
      </Button>
    </div>
  );
}
