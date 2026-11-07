import { Plus, UtensilsCrossed } from "lucide-react";
import { Suspense } from "react";

import { createMenu } from "@/app/(app)/menus/actions";
import { MenuCard } from "@/components/menus/menu-card";
import { Button } from "@/components/ui/button";
import { listMyMenus } from "@/lib/menus";

export const metadata = { title: "Mes menus — Olva" };

/** Bouton « Nouveau menu » : un formulaire qui appelle l'action serveur createMenu. */
function NewMenuButton({ label }: { label: string }) {
  return (
    <form action={createMenu}>
      <Button type="submit">
        <Plus />
        <span>{label}</span>
      </Button>
    </form>
  );
}

/** « Mes menus » (US-MEN-04) : du plus récent au plus ancien. */
export default function MenusPage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Mes menus</h1>
        <NewMenuButton label="Nouveau" />
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Menus />
      </Suspense>
    </main>
  );
}

async function Menus() {
  const menus = await listMyMenus();

  if (menus.length === 0) {
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
    <ul className="grid gap-3">
      {menus.map((menu) => (
        <li key={menu.id}>
          <MenuCard menu={menu} />
        </li>
      ))}
    </ul>
  );
}
