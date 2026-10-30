import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Mot de passe oublié — Olva" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Indiquez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <ForgotPasswordForm />
        <Link
          href="/connexion"
          className="text-primary text-center text-sm underline-offset-4 hover:underline"
        >
          Retour à la connexion
        </Link>
      </CardContent>
    </Card>
  );
}
