import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ReviewEditor } from "@/components/lists/review-editor";
import { StepHeader } from "@/components/lists/step-header";
import { getList, getReview } from "@/lib/lists";

export const metadata = { title: "Revue des ingrédients — Olva" };

// Étape 2 (US-LST-02) : revoir, ajuster, retirer les ingrédients.
export default function ReviewPage({ params }: PageProps<"/listes/[id]/revue">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <StepHeader
        step={2}
        title="Revue des ingrédients"
        subtitle="Ajustez, retirez ce que vous avez déjà"
      />
      <Suspense fallback={<p className="text-muted-foreground">Calcul des ingrédients…</p>}>
        <Review params={params} />
      </Suspense>
    </main>
  );
}

async function Review({ params }: { params: PageProps<"/listes/[id]/revue">["params"] }) {
  const { id } = await params;
  const list = await getList(id);
  if (!list) notFound();
  if (list.status !== "draft") redirect(`/listes/${id}`);
  // Pas encore de recette choisie : retour à l'étape 1
  if (list.recipes.length === 0) redirect(`/listes/${id}/recettes`);

  const review = await getReview(list);
  return (
    <ReviewEditor
      listId={review.listId}
      initialLines={review.lines}
      recipeTitles={review.recipeTitles}
    />
  );
}
