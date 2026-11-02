import { notFound, redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { Suspense } from "react";

import { getList, listHref } from "@/lib/lists";

export const metadata = { title: "Liste — Olva" };

// Page d'une liste. Brouillon : on reprend l'étape en cours.
// Liste prête : la page complète arrive dans la PR suivante du lot 4.
export default function ListPage({ params }: PageProps<"/listes/[id]">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ListContent params={params} />
      </Suspense>
    </main>
  );
}

async function ListContent({ params }: { params: PageProps<"/listes/[id]">["params"] }) {
  const { id } = await params;
  const list = await getList(id);
  if (!list) notFound();
  if (list.status === "draft") {
    redirect(listHref({ id, status: list.status, hasRecipes: list.recipes.length > 0 }));
  }
  return (
    <>
      <Hourglass className="text-primary size-10" aria-hidden="true" />
      <p className="text-muted-foreground">La page de la liste arrive bientôt (lot 4).</p>
    </>
  );
}
