import Link from "next/link";
import { Suspense } from "react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { getCurrentProfile } from "@/lib/profile";

const DESCRIPTIONS: Record<string, string> = {
  "/recettes": "Consulter, ajouter et organiser vos recettes",
  "/nouvelle-liste": "Choisir les recettes de la semaine et préparer la liste",
  "/listes": "Reprendre une liste en préparation",
  "/courses": "Cocher votre liste en magasin",
};

// Accueil : le menu à 4 entrées (SPEC §5)
export default function Home() {
  return (
    <main className="grid gap-6 px-4 py-6">
      <Suspense fallback={<h1 className="h-8 text-2xl font-semibold">Bonjour</h1>}>
        <Greeting />
      </Suspense>
      <ul className="grid gap-3 sm:grid-cols-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="bg-card hover:bg-accent flex min-h-24 items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors"
            >
              <span className="bg-secondary text-secondary-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-6" />
              </span>
              <span className="grid gap-1">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground text-sm">{DESCRIPTIONS[href]}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

async function Greeting() {
  const profile = await getCurrentProfile();
  return (
    <h1 className="text-2xl font-semibold tracking-tight">Bonjour {profile?.display_name} 👋</h1>
  );
}
