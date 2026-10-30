import { redirect } from "next/navigation";
import { Suspense } from "react";

import { OnboardingForm } from "@/components/profile/onboarding-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/profile";

export const metadata = { title: "Bienvenue — Olva" };

// Parcours d'accueil : affiché une seule fois, à la première connexion.
export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <p className="text-3xl font-semibold tracking-tight">Olva</p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Bienvenue !</CardTitle>
          <CardDescription>Deux petites questions avant de commencer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground h-40 text-sm">Chargement…</p>}>
            <WelcomeForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function WelcomeForm() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/connexion");
  if (profile.onboarded) redirect("/");

  return (
    <OnboardingForm displayName={profile.display_name} defaultServings={profile.default_servings} />
  );
}
