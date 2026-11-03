"use client";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

/** Choix du modèle d'IA, sur les aperçus seulement (vide en production : rien n'est affiché). */
export function ModelPicker({
  models,
  value,
  disabled,
  onChange,
}: {
  models: { id: string; label: string }[];
  value: string | undefined;
  disabled?: boolean;
  onChange: (model: string) => void;
}) {
  if (models.length === 0) return null;
  return (
    <div className="grid gap-2">
      <Label htmlFor="ai-model">Modèle d&apos;IA (aperçus seulement, pour comparer)</Label>
      <NativeSelect
        id="ai-model"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
