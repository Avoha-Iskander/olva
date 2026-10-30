"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type ServingsStepperProps = {
  name: string;
  defaultValue: number;
  min?: number;
  max?: number;
  label: string; // décrit le champ pour les lecteurs d'écran
};

/**
 * Sélecteur « − 4 + » du nombre de personnes.
 * La valeur est envoyée avec le formulaire grâce au champ caché (input hidden).
 * useState mémorise la valeur affichée et la met à jour à chaque clic.
 */
export function ServingsStepper({
  name,
  defaultValue,
  min = 1,
  max = 20,
  label,
}: ServingsStepperProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setValue((v) => Math.max(min, v - 1))}
        disabled={value <= min}
        aria-label="Une personne de moins"
      >
        <Minus />
      </Button>
      <output aria-live="polite" className="min-w-16 text-center text-lg font-medium tabular-nums">
        {value} pers.
      </output>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setValue((v) => Math.min(max, v + 1))}
        disabled={value >= max}
        aria-label="Une personne de plus"
      >
        <Plus />
      </Button>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
