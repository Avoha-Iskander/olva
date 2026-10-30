"use client";

import { useActionState } from "react";

import { completeOnboarding, type ProfileFormState } from "@/app/bienvenue/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ServingsStepper } from "@/components/ui/servings-stepper";

export function OnboardingForm({
  displayName,
  defaultServings,
}: {
  displayName: string;
  defaultServings: number;
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    completeOnboarding,
    {},
  );

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FormField
        label="Comment vous appelez-vous ?"
        name="displayName"
        autoComplete="given-name"
        defaultValue={state.displayName ?? displayName}
        error={state.errors?.displayName}
        placeholder="Prénom ou surnom"
        required
      />
      <div className="grid gap-2">
        <p className="text-sm font-medium">
          Pour combien de personnes cuisinez-vous d&apos;habitude ?
        </p>
        <ServingsStepper
          name="defaultServings"
          defaultValue={defaultServings}
          label="Nombre de personnes par défaut"
        />
        <p className="text-muted-foreground text-sm">
          Utilisé par défaut pour vos listes ; modifiable recette par recette.
        </p>
        {state.errors?.defaultServings && (
          <p className="text-destructive text-sm">{state.errors.defaultServings}</p>
        )}
      </div>
      <FormMessage message={state.message} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "C'est parti"}
      </Button>
    </form>
  );
}
