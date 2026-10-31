"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { ItemCombobox } from "@/components/recipe-form/item-combobox";
import { UNIT_OPTIONS } from "@/components/recipe-form/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { CatalogueItem } from "@/lib/catalogue";
import type { FormIngredient } from "@/lib/recipe-form";

/** Une ligne d'ingrédient : article, quantité, unité, remarque, et boutons d'ordre. */
export function IngredientRow({
  line,
  index,
  count,
  items,
  error,
  onChange,
  onMove,
  onRemove,
  onCreateItem,
}: {
  line: FormIngredient;
  index: number;
  count: number;
  items: CatalogueItem[];
  error?: string;
  onChange: (patch: Partial<FormIngredient>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onCreateItem: (name: string) => void;
}) {
  const label = `Ingrédient ${index + 1}`;
  return (
    <li className="grid gap-2 rounded-lg border p-3" aria-label={label}>
      <ItemCombobox
        id={`ingredient-${line.key}`}
        items={items}
        selectedId={line.itemId}
        selectedName={line.itemName}
        invalid={Boolean(error)}
        onSelect={(item) =>
          onChange({
            itemId: item.id,
            itemName: item.name,
            // L'unité habituelle de l'article est proposée si aucune n'est choisie
            unit: line.unit || item.defaultUnit,
          })
        }
        onCreate={onCreateItem}
      />
      <div className="grid grid-cols-[5.5rem_1fr] gap-2">
        <Input
          inputMode="decimal"
          placeholder="Qté"
          aria-label={`${label} : quantité (vide = au goût)`}
          value={line.quantityText}
          onChange={(e) => onChange({ quantityText: e.target.value })}
        />
        <NativeSelect
          aria-label={`${label} : unité`}
          value={line.unit}
          onChange={(e) => onChange({ unit: e.target.value })}
        >
          <option value="">— (au goût)</option>
          {UNIT_OPTIONS.map((u) => (
            <option key={u.code} value={u.code}>
              {u.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Input
        placeholder="Remarque (ex. émincé)"
        aria-label={`${label} : remarque`}
        value={line.note}
        onChange={(e) => onChange({ note: e.target.value })}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label={`Monter ${label.toLowerCase()}`}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          aria-label={`Descendre ${label.toLowerCase()}`}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Supprimer ${label.toLowerCase()}`}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
