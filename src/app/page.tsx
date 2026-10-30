import { Suspense } from "react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// Accueil provisoire : affiche l'utilisateur connecté (le vrai menu arrive plus tard).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Olva</h1>
      <p className="text-muted-foreground max-w-sm text-lg">
        Toutes vos recettes à un endroit, vos listes de courses en 2 minutes.
      </p>
      {/* La session est lue dans les cookies : partie dynamique, isolée dans Suspense */}
      <Suspense fallback={<p className="text-muted-foreground h-5 text-sm">…</p>}>
        <CurrentUser />
      </Suspense>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}

async function CurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  return email ? <p className="text-sm">Connecté en tant que {email}</p> : null;
}
