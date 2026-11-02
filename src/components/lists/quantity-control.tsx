"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { UNIT_OPTIONS } from "@/components/recipe-form/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { parseQuantity, quantityToInput } from "@/lib/quantity";
import { stepQuantity } from "@/lib/review";

/**
 * « − [quantité] + [unité] » : pas selon l'unité, saisie directe possible (« 1,5 », « 1/2 »),
 * passage automatique en kg / l au-delà de 1 000 (setLineQuantity).
 */
export function QuantityControl({
  line,
  onQuantity,
  onUnit,
}: {
  line: { name: string; quantity: number; unit: string };
  onQuantity: (quantity: number) => void;
  onUnit: (unit: string) => void;
}) {
  // Texte en cours de saisie ; null = on affiche la quantité de la ligne
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? quantityToInput(line.quantity);

  function commit() {
    if (draft === null) return;
    const value = parseQuantity(draft);
    if (typeof value === "number" && value > 0) onQuantity(value);
    setDraft(null); // saisie invalide ou vide : on revient à la quantité précédente
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onQuantity(stepQuantity(line.quantity, line.unit, -1))}
        aria-label={`Moins de ${line.name}`}
      >
        <Minus />
      </Button>
      <Input
        inputMode="decimal"
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label={`Quantité de ${line.name}`}
        className="w-16 text-center tabular-nums"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onQuantity(stepQuantity(line.quantity, line.unit, 1))}
        aria-label={`Plus de ${line.name}`}
      >
        <Plus />
      </Button>
      {/* Unité modifiable : la quantité est convertie quand c'est possible (kg → g) */}
      <NativeSelect
        value={line.unit}
        onChange={(e) => onUnit(e.target.value)}
        aria-label={`Unité de ${line.name}`}
        className="w-28 text-sm"
      >
        {UNIT_OPTIONS.map((u) => (
          <option key={u.code} value={u.code}>
            {u.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
