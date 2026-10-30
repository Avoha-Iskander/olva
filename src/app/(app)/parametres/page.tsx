import Link from "next/link";
import { Suspense } from "react";

import { signOut } from "@/app/(auth)/actions";
import { DeleteAccount } from "@/components/profile/delete-account";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/profile";

export const metadata = { title: "Paramètres — Olva" };

export default function SettingsPage() {
  return (
    <main className="mx-auto grid w-full max-w-lg gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <Link href="/" className="text-primary text-sm underline-offset-4 hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Votre nom est visible des personnes avec qui vous partagez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground h-40 text-sm">Chargement…</p>}>
            <ProfileSection />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compte</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Se déconnecter
            </Button>
          </form>
          <DeleteAccount />
        </CardContent>
      </Card>
    </main>
  );
}

async function ProfileSection() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return (
    <ProfileForm displayName={profile.display_name} defaultServings={profile.default_servings} />
  );
}
