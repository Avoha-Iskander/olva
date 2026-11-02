"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, RotateCcw, X } from "lucide-react";

import { saveReviewLines } from "@/app/(app)/nouvelle-liste/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseQuantity, quantityToInput } from "@/lib/quantity";
import {
  formatRequested,
  type ReviewLine,
  setLineQuantity,
  setLineUnit,
  stepQuantity,
} from "@/lib/review";
import { formatQuantity } from "@/lib/units";
import { UNIT_OPTIONS } from "@/components/recipe-form/units";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

/**
 * Étape 2 : revue des ingrédients (US-LST-02).
 * Les lignes arrivent déjà calculées et fusionnées par le serveur ; ici on les ajuste,
 * on les retire ou on coche les ingrédients de base. Chaque changement est enregistré
 * automatiquement, comme à l'étape 1.
 */
export function ReviewEditor({
  listId,
  initialLines,
  recipeTitles,
}: {
  listId: string;
  initialLines: ReviewLine[];
  recipeTitles: Record<string, string>;
}) {
  const [lines, setLines] = useState(initialLines);
  const [saveFailed, setSaveFailed] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initialLines);

  function persist() {
    startTransition(async () => {
      const { ok } = await saveReviewLines(listId, latest.current);
      setSaveFailed(!ok);
    });
  }

  // À l'arrivée : on enregistre tout de suite la revue fusionnée (nouveau calcul + mes ajustements)
  useEffect(() => {
    void saveReviewLines(listId, initialLines).then(({ ok }) => setSaveFailed(!ok));
  }, [listId, initialLines]);

  // En quittant la page : on annule l'enregistrement différé en attente
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function update(key: string, change: (line: ReviewLine) => ReviewLine) {
    const next = lines.map((l) => (l.key === key ? change(l) : l));
    setLines(next);
    latest.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, 600);
  }

  const main = lines.filter((l) => l.section === "main");
  const staples = lines.filter((l) => l.section === "staple");
  const keptCount = lines.filter((l) => l.included).length;
  const changedCount = lines.filter((l) => l.changed && l.included).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/nouvelle-liste"
          className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" />
          Modifier les recettes
        </Link>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {keptCount} article{keptCount > 1 ? "s" : ""} retenu{keptCount > 1 ? "s" : ""}
        </p>
      </div>

      {changedCount > 0 && (
        <p className="bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm">
          {changedCount} ligne{changedCount > 1 ? "s ont" : " a"} changé après la modification des
          recettes : vérifiez les quantités marquées « mis à jour ».
        </p>
      )}

      <section className="grid gap-2" aria-labelledby="main-title">
        <h2 id="main-title" className="font-medium">
          Ingrédients des recettes
        </h2>
        {main.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun ingrédient à acheter.</p>
        ) : (
          <ul className="divide-border bg-card divide-y rounded-xl border">
            {main.map((line) => (
              <li key={line.key} className="p-3">
                <ReviewRow
                  line={line}
                  recipeTitles={recipeTitles}
                  onQuantity={(q) => update(line.key, (l) => setLineQuantity(l, q))}
                  onUnit={(u) => update(line.key, (l) => setLineUnit(l, u))}
                  onToggle={() => update(line.key, (l) => ({ ...l, included: !l.included }))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {staples.length > 0 && (
        <section className="grid gap-2" aria-labelledby="staples-title">
          <div className="grid gap-0.5">
            <h2 id="staples-title" className="font-medium">
              Ingrédients de base — à cocher si besoin
            </h2>
            <p className="text-muted-foreground text-sm">
              Vous en avez sûrement déjà : cochez seulement ce qui manque.
            </p>
          </div>
          <ul className="divide-border bg-card divide-y rounded-xl border">
            {staples.map((line) => (
              <li key={line.key} className="p-3">
                <StapleRow
                  line={line}
                  recipeTitles={recipeTitles}
                  onToggle={() => update(line.key, (l) => ({ ...l, included: !l.included }))}
                  onQuantity={(q) => update(line.key, (l) => setLineQuantity(l, q))}
                  onUnit={(u) => update(line.key, (l) => setLineUnit(l, u))}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="bg-background/95 sticky bottom-20 grid gap-1 py-2 backdrop-blur md:bottom-4">
        {saveFailed && (
          <p role="alert" className="text-destructive text-sm">
            L&apos;enregistrement a échoué. Vérifiez votre connexion.
          </p>
        )}
        <Button type="button" className="w-full" disabled>
          Continuer : pré-liste et articles libres
          <ArrowRight />
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          L&apos;étape 3 arrive au lot 4. Votre revue est enregistrée.
        </p>
      </div>
    </div>
  );
}

/** Recettes d'où vient la ligne, en petit sous le nom. */
function Origin({
  line,
  recipeTitles,
}: {
  line: ReviewLine;
  recipeTitles: Record<string, string>;
}) {
  const titles = line.recipeIds.map((id) => recipeTitles[id]).filter(Boolean);
  if (!titles.length) return null;
  return <p className="text-muted-foreground truncate text-xs">{titles.join(", ")}</p>;
}

function UpdatedBadge({ line }: { line: ReviewLine }) {
  if (!line.changed) return null;
  return (
    <span className="bg-primary text-primary-foreground ml-2 rounded px-1.5 py-0.5 text-xs">
      mis à jour
    </span>
  );
}

/** Ligne d'ingrédient : quantité « − [ ] + » et bouton retirer (ou « Remettre »). */
function ReviewRow({
  line,
  recipeTitles,
  onQuantity,
  onUnit,
  onToggle,
}: {
  line: ReviewLine;
  recipeTitles: Record<string, string>;
  onQuantity: (quantity: number) => void;
  onUnit: (unit: string) => void;
  onToggle: () => void;
}) {
  if (!line.included) {
    // Ligne retirée : reste visible, barrée, pour pouvoir annuler le retrait
    return (
      <div className="flex items-center gap-3">
        <p className="text-muted-foreground min-w-0 flex-1 truncate line-through">
          {line.name} · {formatQuantity(line.quantity, line.unit)}
        </p>
        <Button type="button" variant="ghost" onClick={onToggle}>
          <RotateCcw />
          Remettre
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-medium">
          {line.name}
          <UpdatedBadge line={line} />
        </p>
        <Origin line={line} recipeTitles={recipeTitles} />
      </div>
      <QuantityControl line={line} onQuantity={onQuantity} onUnit={onUnit} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label={`Retirer ${line.name}`}
      >
        <X />
      </Button>
    </div>
  );
}

/** Ingrédient de base : une case à cocher (décochée par défaut). */
function StapleRow({
  line,
  recipeTitles,
  onToggle,
  onQuantity,
  onUnit,
}: {
  line: ReviewLine;
  recipeTitles: Record<string, string>;
  onToggle: () => void;
  onQuantity: (quantity: number) => void;
  onUnit: (unit: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* label autour de la case : toute la zone est cliquable (≥ 44 px) */}
      <label className="flex min-h-11 min-w-0 flex-1 basis-40 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={line.included}
          onChange={onToggle}
          className="accent-primary size-5 shrink-0"
        />
        <span className="min-w-0">
          <span className={cn("block", !line.included && "text-muted-foreground")}>
            {line.name}
            {/* Quantité demandée par les recettes, pour aider à décider */}
            {formatRequested(line) && (
              <span className="text-muted-foreground"> ({formatRequested(line)})</span>
            )}
          </span>
          <Origin line={line} recipeTitles={recipeTitles} />
        </span>
      </label>
      {line.included ? (
        <QuantityControl line={line} onQuantity={onQuantity} onUnit={onUnit} />
      ) : (
        <span className="text-muted-foreground text-sm">
          {formatQuantity(line.quantity, line.unit)}
        </span>
      )}
    </div>
  );
}

/**
 * « − [quantité] + [unité] » : pas selon l'unité, saisie directe possible (« 1,5 », « 1/2 »),
 * passage automatique en kg / l au-delà de 1 000 (setLineQuantity).
 */
function QuantityControl({
  line,
  onQuantity,
  onUnit,
}: {
  line: ReviewLine;
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
