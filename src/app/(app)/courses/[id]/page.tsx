import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

import { ShoppingList } from "@/components/shopping/shopping-list";
import { FirstVisitTip } from "@/components/tutorial/first-visit-tip";
import { getCatalogue } from "@/lib/catalogue";
import { listTitle } from "@/lib/list-title";
import { listHref } from "@/lib/lists";
import { getShoppingList } from "@/lib/shopping";

export const metadata = { title: "Courses — Olva" };

/** Écran de courses d'une liste (US-CRS-01, US-CRS-02). */
export default function ShoppingListPage({ params }: PageProps<"/courses/[id]">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <Link
        href="/courses"
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Mes courses
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: { params: PageProps<"/courses/[id]">["params"] }) {
  const { id } = await params;
  const [list, catalogue] = await Promise.all([getShoppingList(id), getCatalogue()]);
  if (!list) notFound();
  // Une liste encore en préparation se termine d'abord (étapes 1 à 3)
  if (list.status === "draft") {
    redirect(listHref({ id, status: list.status, hasRecipes: list.recipeTitles.length > 0 }));
  }
  // Courses déjà terminées : le récapitulatif
  if (list.status === "done") redirect(`/listes/${id}`);

  return (
    <>
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">
          {listTitle(list.createdAt)}
        </h1>
        {list.sharedBy && (
          <p className="text-muted-foreground text-sm">Liste partagée par {list.sharedBy}</p>
        )}
      </header>
      {/* Astuce de la première visite en mode courses (US-CPT-06) */}
      <FirstVisitTip id="courses">
        Touchez un article pour le cocher. Si la liste est partagée, l&apos;autre personne voit vos
        coches en direct.
      </FirstVisitTip>
      <ShoppingList
        // Un écran neuf pour chaque liste (file d'attente et abonnement propres à la liste)
        key={list.id}
        listId={list.id}
        status={list.status}
        userId={list.userId}
        initialLines={list.lines}
        initialNames={list.names}
        ownerName={list.sharedBy}
        catalogue={catalogue.items}
        aisles={catalogue.aisles}
      />
    </>
  );
}
