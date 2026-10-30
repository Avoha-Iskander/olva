"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  type FieldErrors,
  forgotPasswordSchema,
  newPasswordSchema,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
  toFieldErrors,
} from "@/lib/validation/auth";

/**
 * Actions serveur de l'authentification.
 * « use server » : ces fonctions s'exécutent sur le serveur, jamais dans le navigateur.
 * Le formulaire les appelle directement ; elles renvoient un « état » affiché par la page.
 */

export type AuthFormState = {
  errors?: FieldErrors; // erreurs sous chaque champ
  message?: string; // erreur générale (ex. identifiants incorrects)
  success?: string; // message de réussite (ex. « vérifiez vos emails »)
  email?: string; // pour re-remplir le champ email après une erreur
};

/** Adresse du site (localhost, preview Vercel ou production) pour les liens des emails. */
async function getOrigin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { message: "Confirmez d'abord votre email grâce au lien reçu.", email };
    }
    return { message: "Email ou mot de passe incorrect.", email };
  }

  redirect(safeRedirectPath(String(formData.get("suite") ?? ""), "/"));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await getOrigin()}/auth/confirm` },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { errors: { password: "Mot de passe trop facile à deviner." }, email };
    }
    return { message: "L'inscription a échoué. Réessayez dans un instant.", email };
  }

  // Même message que l'email soit nouveau ou déjà utilisé : on ne révèle pas qui a un compte
  return {
    success: `Un email de confirmation a été envoyé à ${parsed.data.email}. Cliquez sur le lien qu'il contient pour activer votre compte.`,
  };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), email };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getOrigin()}/auth/confirm`,
  });

  // Toujours le même message, que le compte existe ou non
  return {
    success: `Si un compte existe pour ${parsed.data.email}, un email avec un lien de réinitialisation vient d'être envoyé.`,
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.code === "same_password") {
      return { errors: { password: "Choisissez un mot de passe différent de l'ancien." } };
    }
    return { message: "Le lien a expiré. Refaites une demande de réinitialisation." };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
