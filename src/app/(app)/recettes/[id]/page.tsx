import Link from "next/link";
import { redirect } from "next/navigation";
import { SearchX } from "lucide-react";
import { Suspense } from "react";

import { RecipeView } from "@/components/recipes/recipe-view";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/profile";
import { getRecipeForEdit } from "@/lib/recipes";

export const metadata = { title: "Recette — Olva" };

// Fiche recette (US-REC-01) : la page serveur charge la recette, le composant
// client RecipeView l'affiche et gère le sélecteur de personnes.
export default function RecipePage({ params }: PageProps<"/recettes/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Recipe params={params} />
      </Suspense>
    </main>
  );
}

async function Recipe({ params }: { params: PageProps<"/recettes/[id]">["params"] }) {
  const { id } = await params;
  // Les deux lectures partent en même temps (Promise.all) plutôt que l'une après l'autre
  const [profile, recipe] = await Promise.all([getCurrentProfile(), getRecipeForEdit(id)]);
  if (!profile) redirect("/connexion");

  // Recette supprimée, lien erroné, ou recette d'un autre (les règles d'accès la masquent)
  if (!recipe) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <SearchX className="text-primary size-10" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">Recette introuvable</h1>
        <p className="text-muted-foreground max-w-sm">
          Elle a peut-être été supprimée, ou le lien n&apos;est plus valable.
        </p>
        <Button asChild variant="outline">
          <Link href="/recettes">Mes recettes</Link>
        </Button>
      </div>
    );
  }

  return <RecipeView recipe={recipe} defaultServings={profile.default_servings} />;
}
