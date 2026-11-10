import { Plus, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { MenuCard } from "@/components/menus/menu-card";
import { ShareAutoMenusButton } from "@/components/sharing/share-menu-button";
import { Button } from "@/components/ui/button";
import { listMyMenus } from "@/lib/menus";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mes menus — Olva" };

/** « Nouveau » : ouvre le formulaire d'un menu (rien n'est créé avant « Enregistrer »). */
function NewMenuButton({ label }: { label: string }) {
  return (
    <Button asChild>
      <Link href="/menus/nouveau">
        <Plus />
        <span>{label}</span>
      </Link>
    </Button>
  );
}

const TABS = [
  { key: "en-cours", label: "En cours" },
  { key: "termines", label: "Terminés" },
] as const;

/**
 * « Mes menus » (US-MEN-04) : du plus récent au plus ancien, en deux onglets comme Mes
 * listes (décision 079). L'onglet est dans l'adresse (?onglet=termines).
 */
export default function MenusPage({ searchParams }: PageProps<"/menus">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      {/* Mobile : boutons sous le titre ; ordinateur : sur la même ligne (décision 076) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Mes menus</h1>
        <div className="flex flex-wrap gap-2">
          {/* Mes menus, y compris les prochains, en co-édition (décision 077) */}
          <ShareAutoMenusButton label="Partager" />
          <NewMenuButton label="Créer" />
        </div>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Menus searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Menus({ searchParams }: { searchParams: PageProps<"/menus">["searchParams"] }) {
  const [{ onglet }, all] = await Promise.all([searchParams, listMyMenus()]);
  const current = onglet === "termines" ? "termines" : "en-cours";
  const menus = all.filter((m) => (current === "termines") === (m.finishedAt !== null));

  const tabs = (
    <nav aria-label="Menus" className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "en-cours" ? "/menus" : "/menus?onglet=termines"}
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
  );

  // Aucun menu du tout : invitation à créer le premier
  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <UtensilsCrossed className="text-primary size-10" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="font-medium">Aucun menu</p>
          <p className="text-muted-foreground text-sm">
            Choisissez les recettes de la semaine : la liste de courses se prépare ensuite en 2
            minutes.
          </p>
        </div>
        <NewMenuButton label="Créer mon premier menu" />
      </div>
    );
  }

  return (
    <>
      {tabs}
      {menus.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          {current === "termines"
            ? "Aucun menu terminé. Terminez un menu depuis sa fiche une fois la semaine passée."
            : "Aucun menu en cours."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {menus.map((menu) => (
            <li key={menu.id}>
              <MenuCard menu={menu} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
