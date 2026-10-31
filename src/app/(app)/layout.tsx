import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppBottomNav, AppHeader } from "@/components/layout/app-nav";
import { getCurrentProfile } from "@/lib/profile";

/**
 * Gabarit de toutes les pages de l'app : barre du haut, contenu, barre du bas (mobile).
 * Avant d'afficher la page, on vérifie que le parcours d'accueil est terminé ;
 * sinon on renvoie vers /bienvenue.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Le menu lit l'adresse courante : partie dynamique, isolée dans Suspense */}
      <Suspense fallback={<HeaderFallback />}>
        <AppHeader />
      </Suspense>
      {/* pb-24 : laisse la place à la barre du bas sur mobile */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col pb-24 md:pb-8">
        <Suspense fallback={null}>
          <OnboardingGuard>{children}</OnboardingGuard>
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <AppBottomNav />
      </Suspense>
    </>
  );
}

/** En-tête affiché le temps de lire l'adresse (une fraction de seconde). */
function HeaderFallback() {
  return (
    <header className="bg-background sticky top-0 z-30 border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4 text-xl font-semibold tracking-tight">
        Olva
      </div>
    </header>
  );
}

async function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/connexion");
  if (!profile.onboarded) redirect("/bienvenue");
  return children;
}
