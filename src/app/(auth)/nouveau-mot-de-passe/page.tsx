import { NewPasswordForm } from "@/components/auth/new-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Nouveau mot de passe — Olva" };

// Page privée : on y arrive connecté, grâce au lien de réinitialisation reçu par email.
export default function NewPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez votre nouveau mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
        <NewPasswordForm />
      </CardContent>
    </Card>
  );
}
