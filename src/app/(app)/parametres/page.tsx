import Link from "next/link";
import { Store } from "lucide-react";
import { Suspense } from "react";

import { SignOutButton } from "@/components/profile/sign-out-button";
import { DeleteAccount } from "@/components/profile/delete-account";
import { ProfileForm } from "@/components/profile/profile-form";
import { MyShares } from "@/components/sharing/my-shares";
import { ThemeChoice } from "@/components/theme/theme-choice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/profile";
import { getMyShares } from "@/lib/sharing";
import { isTheme } from "@/lib/theme";

export const metadata = { title: "Paramètres — Olva" };

export default function SettingsPage() {
  return (
    <main className="mx-auto grid w-full max-w-lg gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>

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
          <CardTitle>Apparence</CardTitle>
          <CardDescription>
            Automatique suit le réglage de votre téléphone. Votre choix vous suit sur tous vos
            appareils.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground h-11 text-sm">Chargement…</p>}>
            <ThemeSection />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mon catalogue</CardTitle>
          <CardDescription>
            Rayons, ingrédients de base et conversions des articles, à votre façon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/parametres/catalogue">
              <Store />
              Personnaliser mon catalogue
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mes partages</CardTitle>
          <CardDescription>
            Les recettes partagées se consultent sans être modifiées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground h-24 text-sm">Chargement…</p>}>
            <SharesSection />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compte</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <SignOutButton />
          <Suspense fallback={null}>
            <DeleteAccountSection />
          </Suspense>
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

async function SharesSection() {
  return <MyShares shares={await getMyShares()} />;
}

/** Suppression du compte : l'avertissement cite les personnes qui perdront l'accès. */
async function DeleteAccountSection() {
  const { sent } = await getMyShares();
  const names = [...new Set(sent.map((share) => share.personName))];
  return <DeleteAccount sharedWith={names} />;
}

async function ThemeSection() {
  const profile = await getCurrentProfile();
  return <ThemeChoice initialTheme={isTheme(profile?.theme) ? profile.theme : "system"} />;
}
