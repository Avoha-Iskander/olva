import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ExtrasEditor } from "@/components/lists/extras-editor";
import { StepHeader } from "@/components/lists/step-header";
import { getCatalogue } from "@/lib/catalogue";
import { getExtras, getList } from "@/lib/lists";

export const metadata = { title: "Pré-liste — Olva" };

// Étape 3 (US-LST-03, US-LST-04) : pré-liste anti-oubli et articles libres.
export default function PrelistPage({ params }: PageProps<"/listes/[id]/pre-liste">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <StepHeader step={3} title="Pré-liste et articles libres" subtitle="Rien n'est oublié" />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Extras params={params} />
      </Suspense>
    </main>
  );
}

async function Extras({ params }: { params: PageProps<"/listes/[id]/pre-liste">["params"] }) {
  const { id } = await params;
  const list = await getList(id);
  if (!list) notFound();
  if (list.status !== "draft") redirect(`/listes/${id}`);

  const [extras, catalogue] = await Promise.all([getExtras(id), getCatalogue()]);
  return (
    <ExtrasEditor
      listId={id}
      catalogue={catalogue.items}
      aisles={catalogue.aisles}
      initialPrelist={extras.prelist}
      initialChecked={extras.checked}
      initialFree={extras.free}
    />
  );
}
