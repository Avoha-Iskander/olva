import Link from "next/link";
import { ClipboardList, History, ListChecks, Plus } from "lucide-react";
import { Suspense } from "react";

import { createEmptyList } from "@/app/(app)/listes/actions";
import { ShareAutoListsButton } from "@/components/sharing/share-list-button";
import { ListCard } from "@/components/lists/list-card";
import { Button } from "@/components/ui/button";
import { listFinishedLists, listHref, listMyLists } from "@/lib/lists";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mes listes — Olva" };

const TABS = [
  { key: "en-cours", label: "En cours" },
  { key: "terminees", label: "Terminées" },
] as const;

/**
 * « Mes listes » : onglet « En cours » (US-LST-06 : brouillons, listes prêtes, en courses)
 * et onglet « Terminées » (US-CRS-03 : historique, décision 053).
 * L'onglet est dans l'adresse (?onglet=terminees) : il reste au rechargement.
 */
export default function ListsPage({ searchParams }: PageProps<"/listes">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      {/* Mobile : boutons sous le titre ; ordinateur : sur la même ligne (décision 076) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Mes listes</h1>
        <div className="flex flex-wrap gap-2">
          {/* Mes nouvelles listes, partagées automatiquement en co-édition */}
          <ShareAutoListsButton label="Partager" />
          {/* Revoir et configurer ses achats habituels (US-LST-03, décisions 072 et 073) */}
          <Button asChild variant="outline">
            <Link href="/listes/pre-liste">
              <ClipboardList />
              <span>Ma pré-liste</span>
            </Link>
          </Button>
          {/* Liste sans recette (US-LST-08) ; avec recettes : depuis un menu (US-MEN-02) */}
          <form action={createEmptyList}>
            <Button type="submit">
              <Plus />
              <span>Créer</span>
            </Button>
          </form>
        </div>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <TabbedLists searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function TabbedLists({
  searchParams,
}: {
  searchParams: PageProps<"/listes">["searchParams"];
}) {
  const { onglet } = await searchParams;
  const current = onglet === "terminees" ? "terminees" : "en-cours";
  return (
    <>
      <nav aria-label="Listes" className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "en-cours" ? "/listes" : "/listes?onglet=terminees"}
            aria-current={current === tab.key ? "page" : undefined}
            className={cn(
              "flex h-11 items-center justify-center rounded-md text-sm font-medium transition-colors",
              current === tab.key
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {current === "terminees" ? <FinishedLists /> : <OpenLists />}
    </>
  );
}

async function OpenLists() {
  const lists = await listMyLists();

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <ListChecks className="text-primary size-10" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="font-medium">Aucune liste en cours</p>
          <p className="text-muted-foreground text-sm">
            Composez le menu de la semaine pour en tirer la liste, ou créez une liste sans recette.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/menus">Mes menus</Link>
          </Button>
          <form action={createEmptyList}>
            <Button type="submit" variant="outline">
              Liste sans recette
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Listes qui peuvent recevoir une autre liste (« Verser », US-LST-10) : prêtes ou en courses
  const open = lists.filter((l) => l.status === "ready" || l.status === "shopping");

  return (
    <ul className="grid gap-3">
      {lists.map((list) => (
        <li key={list.id}>
          <ListCard
            listId={list.id}
            mergeTargets={
              !list.sharedBy && open.some((l) => l.id === list.id)
                ? open
                    .filter((l) => l.id !== list.id)
                    .map(({ id, name, createdAt, sharedBy }) => ({ id, name, createdAt, sharedBy }))
                : undefined
            }
            href={listHref({
              id: list.id,
              status: list.status,
              hasRecipes: list.recipeTitles.length > 0,
            })}
            status={list.status}
            name={list.name}
            sharedWith={list.sharedWith}
            createdAt={list.createdAt}
            recipeTitles={list.recipeTitles}
            itemCount={list.itemCount}
            sharedBy={list.sharedBy}
          />
        </li>
      ))}
    </ul>
  );
}

/** « Terminée le mardi 3 novembre · 18 / 20 articles pris ». */
function finishedDetail(finishedAt: string | null, checked: number, total: number) {
  const date = finishedAt
    ? new Date(finishedAt).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Europe/Paris",
      })
    : null;
  const taken = `${checked} / ${total} article${total > 1 ? "s" : ""} pris`;
  return date ? `Terminée le ${date} · ${taken}` : taken;
}

async function FinishedLists() {
  const lists = await listFinishedLists();

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <History className="text-primary size-10" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="font-medium">Aucune liste terminée</p>
          <p className="text-muted-foreground text-sm">Vos courses terminées apparaîtront ici.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {lists.map((list) => (
        <li key={list.id}>
          <ListCard
            listId={list.id}
            href={`/listes/${list.id}`}
            status="done"
            name={list.name}
            sharedWith={list.sharedWith}
            createdAt={list.createdAt}
            recipeTitles={list.recipeTitles}
            itemCount={list.itemCount}
            sharedBy={list.sharedBy}
            detail={finishedDetail(list.finishedAt, list.checkedCount, list.itemCount)}
          />
        </li>
      ))}
    </ul>
  );
}
