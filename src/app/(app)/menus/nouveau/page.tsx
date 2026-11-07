import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MenuForm } from "@/components/menus/menu-form";
import { defaultMenuName } from "@/lib/menu-name";
import { getCurrentProfile } from "@/lib/profile";
import { listMyCollections, listMyRecipes } from "@/lib/recipes";

export const metadata = { title: "Nouveau menu — Olva" };

/** Nouveau menu (US-MEN-01) : le formulaire, vide ; rien n'est créé avant « Enregistrer ». */
export default function NewMenuPage() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <Link
        href="/menus"
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Mes menus
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nouveau menu</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Form />
      </Suspense>
    </main>
  );
}

async function Form() {
  const [profile, recipes, collections] = await Promise.all([
    getCurrentProfile(),
    listMyRecipes({}),
    listMyCollections(),
  ]);
  if (!profile) redirect("/connexion");

  return (
    <MenuForm
      menuId={null}
      initialName={defaultMenuName(new Date())}
      initialSelected={[]}
      recipes={recipes} // déjà par ordre alphabétique (listMyRecipes)
      collections={collections}
      defaultServings={profile.default_servings}
      hasOpenList={false}
    />
  );
}
