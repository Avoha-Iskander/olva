"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type AuthFormState, signIn } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";

// « use client » : ce composant tourne dans le navigateur pour afficher l'état du formulaire.
// useActionState relie le formulaire à l'action serveur et récupère son résultat (erreurs…).
export function SignInForm({ suite, initialMessage }: { suite?: string; initialMessage?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signIn, {
    message: initialMessage,
  });

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <input type="hidden" name="suite" value={suite ?? ""} />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        error={state.errors?.email}
        required
      />
      <FormField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.errors?.password}
        required
      />
      <Link
        href="/mot-de-passe-oublie"
        className="text-primary -mt-2 justify-self-end text-sm underline-offset-4 hover:underline"
      >
        Mot de passe oublié ?
      </Link>
      <FormMessage message={state.message} />
      <Button type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
