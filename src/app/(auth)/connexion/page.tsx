import Link from "next/link";
import { Suspense } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Connexion — Olva" };

/**
 * La carte est préconstruite et s'affiche immédiatement ; seul le formulaire attend
 * l'adresse de la page (paramètres « suite » et « erreur »). <Suspense> marque cette
 * frontière et affiche le formulaire vide en attendant.
 */
export default function SignInPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Retrouvez vos recettes et vos listes.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Suspense fallback={<SignInForm />}>
          <SignInFormWithParams searchParams={searchParams} />
        </Suspense>
        <p className="text-muted-foreground text-center text-sm">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-primary underline-offset-4 hover:underline">
            Créer un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

async function SignInFormWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/connexion">["searchParams"];
}) {
  const { suite, erreur } = await searchParams;
  return (
    <SignInForm
      suite={typeof suite === "string" ? suite : undefined}
      initialMessage={
        erreur === "lien" ? "Ce lien est invalide ou a expiré. Réessayez." : undefined
      }
    />
  );
}
