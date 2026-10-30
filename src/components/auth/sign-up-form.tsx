"use client";

import { useActionState } from "react";

import { type AuthFormState, signUp } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signUp, {});

  // Une fois l'email envoyé, on remplace le formulaire par le message de confirmation
  if (state.success) return <FormMessage success={state.success} />;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
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
        label="Mot de passe (8 caractères minimum)"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state.errors?.password}
        required
      />
      <FormField
        label="Confirmer le mot de passe"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={state.errors?.confirmPassword}
        required
      />
      <FormMessage message={state.message} />
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
