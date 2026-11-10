"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { ItemCombobox } from "@/components/recipe-form/item-combobox";
import { UNIT_OPTIONS } from "@/components/recipe-form/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { CatalogueItem } from "@/lib/catalogue";
import { type DraftHighlights, needsReview, type NewItemSuggestion } from "@/lib/import-draft";
import { type FormIngredient, unitForChosenItem } from "@/lib/recipe-form";
import { cn } from "@/lib/utils";

/** Résumé d'une ligne repliée : « 250 g », « Farine », « tamisée ». */
export function ingredientSummary(line: FormIngredient): {
  amount: string;
  name: string;
  note: string;
} {
  const unit = UNIT_OPTIONS.find((u) => u.code === line.unit)?.label ?? "";
  const quantity = line.quantityText.trim();
  return {
    amount: quantity ? `${quantity}${unit && line.unit !== "piece" ? ` ${unit}` : ""}` : "au goût",
    name: line.itemName || "Article à choisir",
    note: line.note.trim(),
  };
}

/**
 * Une ligne d'ingrédient (décision 079) : repliée, elle tient sur une ligne (quantité,
 * article, remarque) ; la toucher la déplie sur place pour modifier article, quantité,
 * unité, remarque, ordre, ou la supprimer.
 * Dans un brouillon importé par photo, une ligne douteuse ou non reconnue est
 * surlignée « À vérifier », avec le nom lu et, si besoin, « Créer l'article ».
 */
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
  highlight,
  open,
  onToggle,
}: {
  line: FormIngredient;
  index: number;
  count: number;
  items: CatalogueItem[];
  error?: string;
  onChange: (patch: Partial<FormIngredient>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onCreateItem: (name: string, suggestion?: NewItemSuggestion | null) => void;
  highlight?: DraftHighlights["ingredients"][string];
  /** Dépliée : formulaire complet ; repliée : une ligne de résumé. */
  open: boolean;
  onToggle: () => void;
}) {
  const label = `Ingrédient ${index + 1}`;
  // « À vérifier » (fond ambre) seulement s'il y a quelque chose à faire ;
  // un article simplement proposé par l'IA reçoit une mention discrète
  const review = highlight && needsReview(highlight) ? highlight : null;
  const proposedOnly = highlight && !review && highlight.proposed ? highlight : null;
  const summary = ingredientSummary(line);

  // Repliée : un seul bouton, toute la ligne se touche pour la déplier
  if (!open) {
    return (
      <li aria-label={label}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          className="hover:bg-accent flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
        >
          <span className="text-muted-foreground w-20 shrink-0 text-sm">{summary.amount}</span>
          <span className="min-w-0 flex-1 truncate">
            {summary.name}
            {summary.note && (
              <span className="text-muted-foreground text-sm"> · {summary.note}</span>
            )}
          </span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Modifier</span>
        </button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "grid gap-2 rounded-lg border p-3",
        review &&
          "border-transparent bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-950/40 dark:ring-amber-500",
      )}
      aria-label={label}
    >
      {/* En-tête de la ligne dépliée : le toucher la replie */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={true}
        className="-m-1 flex min-h-11 items-center gap-2 rounded-md p-1 text-left font-medium"
      >
        <span className="min-w-0 flex-1 truncate">{summary.name}</span>
        <ChevronUp className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Replier</span>
      </button>
      {proposedOnly && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          Proposé pour « {proposedOnly.readName} » : changez l&apos;article s&apos;il ne convient
          pas.
        </p>
      )}
      {review && (
        <div className="grid gap-2 text-sm text-amber-900 dark:text-amber-200">
          <p className="flex items-center gap-1.5 font-medium">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />À vérifier
          </p>
          <p>
            Lu : « {review.readName} »
            {review.unrecognized
              ? ". Cet article n'est pas dans votre catalogue : choisissez-en un, ou créez-le."
              : ". Lecture incertaine : vérifiez la quantité et l'unité."}
          </p>
          {review.unrecognized && (
            <Button
              type="button"
              variant="outline"
              className="bg-background justify-self-start"
              onClick={() => onCreateItem(review.readName, review.newItem)}
            >
              <Plus />
              Créer l&apos;article « {review.readName} »
            </Button>
          )}
        </div>
      )}
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
            unit: unitForChosenItem(line.unit, item.defaultUnit),
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
