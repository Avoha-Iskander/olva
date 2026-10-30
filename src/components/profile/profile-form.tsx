"use client";

import { useActionState } from "react";

import { updateProfile } from "@/app/(app)/parametres/actions";
import type { ProfileFormState } from "@/app/bienvenue/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ServingsStepper } from "@/components/ui/servings-stepper";

export function ProfileForm({
  displayName,
  defaultServings,
}: {
  displayName: string;
  defaultServings: number;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState & { success?: string },
    FormData
  >(updateProfile, {});

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FormField
        label="Nom affiché"
        name="displayName"
        autoComplete="given-name"
        defaultValue={state.displayName ?? displayName}
        error={state.errors?.displayName}
        required
      />
      <div className="grid gap-2">
        <p className="text-sm font-medium">Nombre de personnes par défaut</p>
        <ServingsStepper
          name="defaultServings"
          defaultValue={defaultServings}
          label="Nombre de personnes par défaut"
        />
        {state.errors?.defaultServings && (
          <p className="text-destructive text-sm">{state.errors.defaultServings}</p>
        )}
      </div>
      <FormMessage message={state.message} success={state.success} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
