import Link from "next/link";

import { GoogleButton, OrSeparator } from "@/components/auth/google-button";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Créer un compte — Olva" };

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>
          Toutes vos recettes à un endroit, vos listes de courses en 2 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <GoogleButton />
        <OrSeparator />
        <SignUpForm />
        <p className="text-muted-foreground text-center text-sm">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-primary underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
