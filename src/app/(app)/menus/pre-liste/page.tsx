import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PrelistManager } from "@/components/lists/prelist-manager";
import { Button } from "@/components/ui/button";
import { getCatalogue } from "@/lib/catalogue";
import { getMyPrelist } from "@/lib/lists";

export const metadata = { title: "Ma pré-liste — Olva" };

/** Menus → « Ma pré-liste » (US-LST-03, décision 072) : revoir et configurer mes achats habituels. */
export default function MyPrelistPage() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-6">
      <Button asChild variant="ghost" className="-ml-3 justify-self-start">
        <Link href="/menus">
          <ArrowLeft />
          Mes menus
        </Link>
      </Button>
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ma pré-liste</h1>
        <p className="text-muted-foreground text-sm">
          Vos achats habituels, proposés à chaque nouvelle liste pour ne rien oublier.
        </p>
      </header>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const [prelist, catalogue] = await Promise.all([getMyPrelist(), getCatalogue()]);
  return (
    <PrelistManager
      catalogue={catalogue.items}
      aisles={catalogue.aisles}
      initialPrelist={prelist}
    />
  );
}
