import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Share2, ShoppingCart } from "lucide-react";
import { Suspense } from "react";

import { ListEditor } from "@/components/lists/list-editor";
import { ShareListButton } from "@/components/sharing/share-list-button";
import { Button } from "@/components/ui/button";
import { getCatalogue } from "@/lib/catalogue";
import { listTitle } from "@/lib/list-title";
import { getListPage, listHref } from "@/lib/lists";

export const metadata = { title: "Liste — Olva" };

// Page d'une liste. Brouillon : on reprend l'étape en cours. Liste prête : ses articles.
export default function ListPage({ params }: PageProps<"/listes/[id]">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <Link
        href="/listes"
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Mes listes en cours
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ListContent params={params} />
      </Suspense>
    </main>
  );
}

async function ListContent({ params }: { params: PageProps<"/listes/[id]">["params"] }) {
  const { id } = await params;
  const [list, catalogue] = await Promise.all([getListPage(id), getCatalogue()]);
  if (!list) notFound();
  if (list.status === "draft") {
    redirect(listHref({ id, status: list.status, hasRecipes: list.recipeTitles.length > 0 }));
  }

  return (
    <>
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">
          {listTitle(list.createdAt)}
        </h1>
        <p className="text-muted-foreground text-sm">
          {list.lines.length} article{list.lines.length > 1 ? "s" : ""}
          {list.recipeTitles.length > 0 && ` · ${list.recipeTitles.join(", ")}`}
        </p>
        {list.sharedBy && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Share2 className="size-4" aria-hidden="true" />
            Partagée par {list.sharedBy} : vous pouvez la modifier
          </p>
        )}
      </header>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/courses/${list.id}`}>
            <ShoppingCart />
            Faire les courses
          </Link>
        </Button>
        {/* Seul le créateur partage sa liste */}
        {!list.sharedBy && <ShareListButton listId={list.id} />}
      </div>

      {/* key : la liste relue après un ajout remplace l'affichage */}
      <ListEditor
        key={list.lines.map((l) => `${l.id}:${l.quantity}:${l.unit}`).join("|")}
        listId={list.id}
        initialLines={list.lines}
        catalogue={catalogue.items}
        aisles={catalogue.aisles}
      />
    </>
  );
}
