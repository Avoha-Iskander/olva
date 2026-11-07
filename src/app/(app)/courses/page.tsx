import Link from "next/link";
import { ChevronRight, Share2, ShoppingCart } from "lucide-react";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { listTitle } from "@/lib/list-title";
import { listShoppableLists } from "@/lib/shopping";

export const metadata = { title: "Faire ses courses — Olva" };

/** « Faire ses courses » (US-CRS-01) : les listes prêtes, les miennes et celles qu'on me partage. */
export default function ShoppingPage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Faire ses courses</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ShoppableLists />
      </Suspense>
    </main>
  );
}

async function ShoppableLists() {
  const lists = await listShoppableLists();

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <ShoppingCart className="text-primary size-10" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="font-medium">Aucune liste prête</p>
          <p className="text-muted-foreground text-sm">
            Préparez une liste depuis un menu, puis terminez-la pour faire vos courses.
          </p>
        </div>
        <Button asChild>
          <Link href="/menus">Mes menus</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {lists.map((list) => (
        <li key={list.id}>
          <Link
            href={`/courses/${list.id}`}
            className="bg-card hover:bg-accent flex items-center gap-3 rounded-xl border p-3 shadow-sm transition-colors"
          >
            <span className="bg-secondary flex size-12 shrink-0 items-center justify-center rounded-lg">
              <ShoppingCart className="text-secondary-foreground/70 size-6" aria-hidden="true" />
            </span>
            <span className="grid min-w-0 flex-1 gap-1">
              <span className="font-medium first-letter:uppercase">
                {listTitle(list.createdAt)}
              </span>
              {list.sharedBy && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Share2 className="size-3" aria-hidden="true" />
                  Partagée par {list.sharedBy}
                </span>
              )}
              <span className="text-muted-foreground truncate text-sm">
                {list.itemCount} article{list.itemCount > 1 ? "s" : ""}
                {list.recipeTitles.length > 0 && ` · ${list.recipeTitles.join(", ")}`}
              </span>
            </span>
            <span className="text-primary flex shrink-0 items-center gap-1 text-sm font-medium">
              {list.status === "shopping" ? "Reprendre" : "Commencer"}
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
