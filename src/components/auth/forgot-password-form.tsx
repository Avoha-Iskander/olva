"use client";

import { useActionState } from "react";

import { type AuthFormState, requestPasswordReset } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    {},
  );

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
      <FormMessage message={state.message} />
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un lien"}
      </Button>
    </form>
  );
}
