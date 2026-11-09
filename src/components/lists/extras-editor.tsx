"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";

import {
  finishList,
  removePrelistItem,
  saveExtras,
  upsertPrelistItem,
} from "@/app/(app)/listes/actions";
import { AisleHeading } from "@/components/lists/aisle-heading";
import { QuantityControl } from "@/components/lists/quantity-control";
import { ItemCombobox } from "@/components/recipe-form/item-combobox";
import { NewItemDialog } from "@/components/recipe-form/new-item-dialog";
import { Button } from "@/components/ui/button";
import { groupExtrasByAisle } from "@/lib/extras";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import type { ExtraItem } from "@/lib/lists";
import { normalizeUnit } from "@/lib/review";
import { convertQuantity, formatQuantity, roundQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";

type Amount = { quantity: number; unit: string };

/** Nouvelle quantité : passage automatique g ↔ kg, ml ↔ l (comme à l'étape 2). */
const withQuantity = (quantity: number, unit: string): Amount => normalizeUnit(quantity, unit);

/** Nouvelle unité : quantité convertie si possible (1 l → 1 000 ml), sinon gardée. */
function withUnit(current: Amount, unit: string): Amount {
  const converted = convertQuantity(current.quantity, current.unit, unit);
  return { quantity: converted !== null ? roundQuantity(converted) : current.quantity, unit };
}

/**
 * Étape 3 (US-LST-03, US-LST-04) : pré-liste anti-oubli et articles libres.
 * - Pré-liste : je coche ce qui manque ; « Modifier ma pré-liste » permet d'ajouter,
 *   de retirer un article ou de changer sa quantité habituelle.
 * - Articles libres : recherche dans le catalogue, ou création d'un article.
 * Les lignes cochées et les articles libres sont enregistrés automatiquement.
 */
export function ExtrasEditor({
  listId,
  catalogue,
  aisles,
  initialPrelist,
  initialChecked,
  initialFree,
  planned,
}: {
  listId: string;
  catalogue: CatalogueItem[];
  aisles: Aisle[];
  initialPrelist: ExtraItem[];
  initialChecked: ExtraItem[];
  initialFree: ExtraItem[];
  /** « Déjà prévu » par les recettes : libellé par article (US-LST-03, décision 070). */
  planned: Record<string, string>;
}) {
  const [items, setItems] = useState(catalogue);
  const [prelist, setPrelist] = useState(initialPrelist);
  // Articles de la pré-liste cochés pour CETTE liste, avec la quantité choisie
  const [checked, setChecked] = useState(
    () => new Map(initialChecked.map((c) => [c.itemId, { quantity: c.quantity, unit: c.unit }])),
  );
  const [free, setFree] = useState(initialFree);
  const [editing, setEditing] = useState(false);
  const [newItem, setNewItem] = useState<{ name: string; target: "free" | "prelist" } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [finishing, startFinish] = useTransition();

  // --- Enregistrement automatique des lignes de la liste (comme dans le menu et la revue) ---
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ checked, free });
  const dirty = useRef(false);

  function toLines(state: { checked: Map<string, Amount>; free: ExtraItem[] }) {
    return [
      ...[...state.checked].map(([itemId, a]) => ({ itemId, origin: "prelist" as const, ...a })),
      ...state.free.map((f) => ({
        itemId: f.itemId,
        origin: "free" as const,
        quantity: f.quantity,
        unit: f.unit,
      })),
    ];
  }

  async function persist() {
    dirty.current = false;
    const { ok } = await saveExtras(listId, toLines(latest.current));
    setSaveFailed(!ok);
    return ok;
  }

  function schedule(next: { checked?: Map<string, Amount>; free?: ExtraItem[] }) {
    latest.current = { ...latest.current, ...next };
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), 600);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function updateChecked(change: (map: Map<string, Amount>) => void) {
    const next = new Map(checked);
    change(next);
    setChecked(next);
    schedule({ checked: next });
  }

  function updateFree(next: ExtraItem[]) {
    setFree(next);
    schedule({ free: next });
  }

  // --- Pré-liste ----------------------------------------------------------------
  function togglePrelist(entry: ExtraItem) {
    updateChecked((map) => {
      if (map.has(entry.itemId)) map.delete(entry.itemId);
      else map.set(entry.itemId, { quantity: entry.quantity, unit: entry.unit });
    });
  }

  function changeUsual(entry: ExtraItem, amount: Amount) {
    setPrelist((list) => list.map((p) => (p.itemId === entry.itemId ? { ...p, ...amount } : p)));
    void upsertPrelistItem({ itemId: entry.itemId, ...amount });
  }

  function removeFromPrelist(entry: ExtraItem) {
    setPrelist((list) => list.filter((p) => p.itemId !== entry.itemId));
    if (checked.has(entry.itemId)) updateChecked((map) => map.delete(entry.itemId));
    void removePrelistItem(entry.itemId);
  }

  /** Rayon d'un article du catalogue (les rayons arrivent dans l'ordre du magasin). */
  function aisleOf(item: CatalogueItem) {
    const index = aisles.findIndex((a) => a.id === item.aisleId);
    return { aisleName: aisles[index]?.name, aislePosition: index === -1 ? 99 : index + 1 };
  }

  function addToPrelist(item: CatalogueItem) {
    if (prelist.some((p) => p.itemId === item.id)) return;
    const entry: ExtraItem = {
      itemId: item.id,
      name: item.name,
      ...aisleOf(item),
      quantity: 1,
      unit: item.purchaseUnit ?? item.defaultUnit,
    };
    setPrelist((list) => [...list, entry]);
    void upsertPrelistItem({ itemId: entry.itemId, quantity: entry.quantity, unit: entry.unit });
  }

  // --- Articles libres ------------------------------------------------------------
  function addFree(item: CatalogueItem) {
    // Déjà dans ma pré-liste : on le coche plutôt que de le doubler (décision 074)
    const inPrelist = prelist.find((p) => p.itemId === item.id);
    if (inPrelist) {
      if (!checked.has(item.id)) togglePrelist(inPrelist);
      return;
    }
    // Déjà ajouté : on n'en crée pas une deuxième ligne
    if (free.some((f) => f.itemId === item.id)) return;
    updateFree([
      ...free,
      {
        itemId: item.id,
        name: item.name,
        ...aisleOf(item),
        quantity: 1,
        unit: item.purchaseUnit ?? item.defaultUnit,
      },
    ]);
  }

  function finish() {
    if (timer.current) clearTimeout(timer.current);
    startFinish(async () => {
      if (dirty.current && !(await persist())) return;
      const result = await finishList(listId); // redirige vers la liste si tout va bien
      if (result && !result.ok) setSaveFailed(true);
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3" aria-labelledby="prelist-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="grid gap-0.5">
            <h2 id="prelist-title" className="font-medium">
              Ma pré-liste
            </h2>
            <p className="text-muted-foreground text-sm">
              {editing
                ? "Ajoutez, retirez, changez la quantité habituelle."
                : "Vos achats habituels : cochez ce qui manque."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? <Check /> : <Pencil />}
            {editing ? "Terminé" : "Modifier ma pré-liste"}
          </Button>
        </div>

        {/* Article ponctuel (US-LST-04) : il se range aussitôt dans son rayon, plus bas
            (décision 074) ; le champ est en haut pour qu'on le voie arriver */}
        {!editing && (
          <ItemCombobox
            items={items}
            selectedId={null}
            selectedName=""
            placeholder="Autre chose ? Ajouter un article…"
            hints={planned}
            onSelect={addFree}
            onCreate={(name) => setNewItem({ name, target: "free" })}
          />
        )}

        {prelist.length === 0 && free.length === 0 && !editing ? (
          <p className="text-muted-foreground text-sm">
            Votre pré-liste est vide. « Modifier ma pré-liste » pour y ajouter vos achats habituels.
          </p>
        ) : (
          <div className="grid gap-3">
            {/* Un bloc par rayon, dans l'ordre du magasin : pré-liste puis ajouts */}
            {groupExtrasByAisle(prelist, free).map((group) => (
              <div key={group.aisle} className="grid gap-1.5">
                <AisleHeading aisle={group.aisle} />
                <ul className="divide-border bg-card divide-y rounded-xl border">
                  {group.rows.map(({ kind, entry }) =>
                    kind === "free" ? (
                      <FreeRow
                        key={`free-${entry.itemId}`}
                        line={entry}
                        onAmount={(amount) =>
                          updateFree(
                            free.map((f) => (f.itemId === entry.itemId ? { ...f, ...amount } : f)),
                          )
                        }
                        onRemove={() => updateFree(free.filter((f) => f.itemId !== entry.itemId))}
                      />
                    ) : (
                      <PrelistRow
                        key={entry.itemId}
                        entry={entry}
                        editing={editing}
                        amount={checked.get(entry.itemId)}
                        planned={planned[entry.itemId]}
                        onToggle={() => togglePrelist(entry)}
                        onChecked={(amount) =>
                          updateChecked((map) => map.set(entry.itemId, amount))
                        }
                        onUsual={(amount) => changeUsual(entry, amount)}
                        onRemove={() => removeFromPrelist(entry)}
                      />
                    ),
                  )}
                </ul>
              </div>
            ))}
            {editing && (
              <div>
                <ItemCombobox
                  items={items}
                  selectedId={null}
                  selectedName=""
                  placeholder="Ajouter un article à ma pré-liste…"
                  onSelect={addToPrelist}
                  onCreate={(name) => setNewItem({ name, target: "prelist" })}
                />
              </div>
            )}
          </div>
        )}
      </section>

      <div className="bg-background/95 sticky bottom-20 grid gap-1 py-2 backdrop-blur md:bottom-4">
        {saveFailed && (
          <p role="alert" className="text-destructive text-sm">
            L&apos;enregistrement a échoué. Vérifiez votre connexion.
          </p>
        )}
        <Button type="button" className="w-full" onClick={finish} disabled={finishing}>
          <Check />
          {finishing ? "Enregistrement…" : "Terminer la liste"}
        </Button>
      </div>

      <NewItemDialog
        key={newItem ? `${newItem.target}-${newItem.name}` : "closed"}
        open={newItem !== null}
        initialName={newItem?.name ?? ""}
        aisles={aisles}
        onOpenChange={(open) => !open && setNewItem(null)}
        onCreated={(item) => {
          setItems((list) =>
            list.some((i) => i.id === item.id)
              ? list
              : [...list, item].sort((a, b) => a.name.localeCompare(b.name, "fr")),
          );
          if (newItem?.target === "prelist") addToPrelist(item);
          else addFree(item);
          setNewItem(null);
        }}
      />
    </div>
  );
}

/** Une ligne de ma pré-liste : à cocher, ou à configurer en mode « Modifier ». */
function PrelistRow({
  entry,
  editing,
  amount,
  planned,
  onToggle,
  onChecked,
  onUsual,
  onRemove,
}: {
  entry: ExtraItem;
  editing: boolean;
  amount: Amount | undefined; // cochée pour cette liste : quantité choisie
  planned: string | undefined; // « Déjà prévu » par les recettes
  onToggle: () => void;
  onChecked: (amount: Amount) => void;
  onUsual: (amount: Amount) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
      {editing ? (
        <>
          <span className="min-w-0 flex-1 basis-40">{entry.name}</span>
          <QuantityControl
            line={entry}
            onQuantity={(q) => onUsual(withQuantity(q, entry.unit))}
            onUnit={(u) => onUsual(withUnit(entry, u))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`Retirer ${entry.name} de ma pré-liste`}
          >
            <X />
          </Button>
        </>
      ) : (
        <>
          <label className="flex min-h-11 min-w-0 flex-1 basis-40 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(amount)}
              onChange={onToggle}
              className="accent-primary size-5 shrink-0"
            />
            <span className="grid">
              <span className={cn(!amount && "text-muted-foreground")}>{entry.name}</span>
              {planned && (
                <span className="text-primary text-xs font-medium">Déjà prévu : {planned}</span>
              )}
            </span>
          </label>
          {amount ? (
            <QuantityControl
              line={{ name: entry.name, ...amount }}
              onQuantity={(q) => onChecked(withQuantity(q, amount.unit))}
              onUnit={(u) => onChecked(withUnit(amount, u))}
            />
          ) : (
            <span className="text-muted-foreground text-sm">
              {formatQuantity(entry.quantity, entry.unit)}
            </span>
          )}
        </>
      )}
    </li>
  );
}

/** Un article ajouté ponctuellement à cette liste (US-LST-04), rangé dans son rayon. */
function FreeRow({
  line,
  onAmount,
  onRemove,
}: {
  line: ExtraItem;
  onAmount: (amount: Amount) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
      <span className="flex min-w-0 flex-1 basis-40 items-center gap-2">
        <span className="font-medium">{line.name}</span>
        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
          ajouté
        </span>
      </span>
      <QuantityControl
        line={line}
        onQuantity={(q) => onAmount(withQuantity(q, line.unit))}
        onUnit={(u) => onAmount(withUnit(line, u))}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Retirer ${line.name}`}
      >
        <X />
      </Button>
    </li>
  );
}
