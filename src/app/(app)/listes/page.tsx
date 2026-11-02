import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { Suspense } from "react";

import { ListCard } from "@/components/lists/list-card";
import { Button } from "@/components/ui/button";
import { listHref, listMyLists } from "@/lib/lists";

export const metadata = { title: "Mes listes en cours — Olva" };

// « Mes listes en cours » (US-LST-06) : brouillons à reprendre et listes prêtes.
export default function ListsPage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Mes listes en cours</h1>
        <Button asChild>
          <Link href="/nouvelle-liste">
            <Plus />
            <span>Nouvelle</span>
          </Link>
        </Button>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Lists />
      </Suspense>
    </main>
  );
}

async function Lists() {
  const lists = await listMyLists();

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <ListChecks className="text-primary size-10" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="font-medium">Aucune liste en cours</p>
          <p className="text-muted-foreground text-sm">
            Choisissez vos recettes : la liste de courses se prépare en 2 minutes.
          </p>
        </div>
        <Button asChild>
          <Link href="/nouvelle-liste">Créer une liste</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {lists.map((list) => (
        <li key={list.id}>
          <ListCard
            listId={list.id}
            href={listHref({
              id: list.id,
              status: list.status,
              hasRecipes: list.recipeTitles.length > 0,
            })}
            status={list.status}
            createdAt={list.createdAt}
            recipeTitles={list.recipeTitles}
            itemCount={list.itemCount}
          />
        </li>
      ))}
    </ul>
  );
}
