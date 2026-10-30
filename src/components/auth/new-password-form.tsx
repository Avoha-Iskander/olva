"use client";

import { useActionState } from "react";

import { type AuthFormState, updatePassword } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(updatePassword, {});

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormField
        label="Nouveau mot de passe (8 caractères minimum)"
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
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
