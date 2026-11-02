import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ReviewEditor } from "@/components/lists/review-editor";
import { getCurrentDraft, getReview } from "@/lib/lists";

export const metadata = { title: "Revue des ingrédients — Olva" };

// Étape 2 de « Nouvelle liste » (US-LST-02) : revoir, ajuster, retirer les ingrédients.
export default function ReviewPage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Revue des ingrédients</h1>
        <p className="text-muted-foreground text-sm">
          Étape 2 sur 3 · Ajustez, retirez ce que vous avez déjà
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Calcul des ingrédients…</p>}>
        <Review />
      </Suspense>
    </main>
  );
}

async function Review() {
  const draft = await getCurrentDraft();
  // Pas encore de recette choisie : retour à l'étape 1
  if (!draft || draft.recipes.length === 0) redirect("/nouvelle-liste");

  const review = await getReview(draft);
  return (
    <ReviewEditor
      listId={review.listId}
      initialLines={review.lines}
      recipeTitles={review.recipeTitles}
    />
  );
}
