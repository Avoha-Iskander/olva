import { Suspense } from "react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/profile";

// Accueil provisoire : salue l'utilisateur (le vrai menu à 4 entrées arrive plus tard).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Olva</h1>
      <Suspense fallback={<p className="h-7" />}>
        <Greeting />
      </Suspense>
      <p className="text-muted-foreground max-w-sm text-lg">
        Toutes vos recettes à un endroit, vos listes de courses en 2 minutes.
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}

async function Greeting() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return (
    <p className="text-lg">
      Bonjour {profile.display_name} · {profile.default_servings} pers. par défaut
    </p>
  );
}
