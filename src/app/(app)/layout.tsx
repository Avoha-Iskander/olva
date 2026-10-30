import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getCurrentProfile } from "@/lib/profile";

/**
 * Gabarit de toutes les pages de l'app (accueil, recettes, listes…).
 * Avant d'afficher la page, on vérifie que le parcours d'accueil est terminé ;
 * sinon on renvoie vers /bienvenue.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={null}>
      <OnboardingGuard>{children}</OnboardingGuard>
    </Suspense>
  );
}

async function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/connexion");
  if (!profile.onboarded) redirect("/bienvenue");
  return children;
}
