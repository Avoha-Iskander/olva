"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Pencil, Undo2, X } from "lucide-react";

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
import { groupByAisle } from "@/lib/aisles";
import { type CarryoverChoice, carryoverLines } from "@/lib/carryover";
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
  initialCarryover,
}: {
  listId: string;
  catalogue: CatalogueItem[];
  aisles: Aisle[];
  initialPrelist: ExtraItem[];
  initialChecked: ExtraItem[];
  initialFree: ExtraItem[];
  initialCarryover: CarryoverChoice[];
}) {
  const [items, setItems] = useState(catalogue);
  const [prelist, setPrelist] = useState(initialPrelist);
  // Articles de la pré-liste cochés pour CETTE liste, avec la quantité choisie
  const [checked, setChecked] = useState(
    () => new Map(initialChecked.map((c) => [c.itemId, { quantity: c.quantity, unit: c.unit }])),
  );
  const [free, setFree] = useState(initialFree);
  // Reports de mes dernières courses (US-CRS-03) : gardés par défaut
  const [carryover, setCarryover] = useState(initialCarryover);
  const [editing, setEditing] = useState(false);
  const [newItem, setNewItem] = useState<{ name: string; target: "free" | "prelist" } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [finishing, startFinish] = useTransition();

  // --- Enregistrement automatique des lignes de la liste (comme aux étapes 1 et 2) ---
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ checked, free, carryover });
  const dirty = useRef(false);

  function toLines(state: {
    checked: Map<string, Amount>;
    free: ExtraItem[];
    carryover: CarryoverChoice[];
  }) {
    return [
      ...carryoverLines(state.carryover),
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

  function schedule(next: {
    checked?: Map<string, Amount>;
    free?: ExtraItem[];
    carryover?: CarryoverChoice[];
  }) {
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

  // --- Reports ------------------------------------------------------------------
  function toggleCarryover(key: string) {
    const next = carryover.map((c) => (c.key === key ? { ...c, kept: !c.kept } : c));
    setCarryover(next);
    schedule({ carryover: next });
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
      {carryover.length > 0 && (
        <section className="grid gap-2" aria-labelledby="carryover-title">
          <div className="grid gap-0.5">
            <h2 id="carryover-title" className="font-medium">
              Reportés de vos dernières courses
            </h2>
            <p className="text-muted-foreground text-sm">
              Pas trouvés la dernière fois : décochez ceux dont vous n&apos;avez plus besoin.
            </p>
          </div>
          <ul className="divide-border bg-card divide-y rounded-xl border">
            {carryover.map((c) => (
              <li key={c.key}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={c.kept}
                    onChange={() => toggleCarryover(c.key)}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                      "peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]",
                      c.kept
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {c.kept && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className={cn("flex-1", !c.kept && "text-muted-foreground line-through")}>
                    {c.name}
                  </span>
                  <span className="bg-muted text-muted-foreground flex items-center gap-1 rounded px-1.5 py-0.5 text-xs">
                    <Undo2 className="size-3" aria-hidden="true" />
                    Reporté
                  </span>
                  <span className="text-sm tabular-nums">{formatQuantity(c.quantity, c.unit)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-2" aria-labelledby="prelist-title">
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

        {prelist.length === 0 && !editing ? (
          <p className="text-muted-foreground text-sm">
            Votre pré-liste est vide. « Modifier ma pré-liste » pour y ajouter vos achats habituels.
          </p>
        ) : (
          <div className="grid gap-3">
            {/* Un bloc par rayon, dans l'ordre du magasin */}
            {groupByAisle(prelist).map((group) => (
              <div key={group.aisle} className="grid gap-1.5">
                <AisleHeading>{group.aisle}</AisleHeading>
                <ul className="divide-border bg-card divide-y rounded-xl border">
                  {group.lines.map((entry) => {
                    const amount = checked.get(entry.itemId);
                    return (
                      <li
                        key={entry.itemId}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
                      >
                        {editing ? (
                          <>
                            <span className="min-w-0 flex-1 basis-40">{entry.name}</span>
                            <QuantityControl
                              line={entry}
                              onQuantity={(q) => changeUsual(entry, withQuantity(q, entry.unit))}
                              onUnit={(u) => changeUsual(entry, withUnit(entry, u))}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromPrelist(entry)}
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
                                onChange={() => togglePrelist(entry)}
                                className="accent-primary size-5 shrink-0"
                              />
                              <span className={cn(!amount && "text-muted-foreground")}>
                                {entry.name}
                              </span>
                            </label>
                            {amount ? (
                              <QuantityControl
                                line={{ name: entry.name, ...amount }}
                                onQuantity={(q) =>
                                  updateChecked((map) =>
                                    map.set(entry.itemId, withQuantity(q, amount.unit)),
                                  )
                                }
                                onUnit={(u) =>
                                  updateChecked((map) => map.set(entry.itemId, withUnit(amount, u)))
                                }
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
                  })}
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

      <section className="grid gap-2" aria-labelledby="free-title">
        <div className="grid gap-0.5">
          <h2 id="free-title" className="font-medium">
            Autre chose ?
          </h2>
          <p className="text-muted-foreground text-sm">
            Ajoutez un article ponctuel, alimentaire ou non.
          </p>
        </div>
        <ItemCombobox
          items={items}
          selectedId={null}
          selectedName=""
          placeholder="Ajouter un article…"
          onSelect={addFree}
          onCreate={(name) => setNewItem({ name, target: "free" })}
        />
        {free.length > 0 && (
          <div className="grid gap-3">
            {groupByAisle(free).map((group) => (
              <div key={group.aisle} className="grid gap-1.5">
                <AisleHeading>{group.aisle}</AisleHeading>
                <ul className="divide-border bg-card divide-y rounded-xl border">
                  {group.lines.map((line) => (
                    <li
                      key={line.itemId}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
                    >
                      <span className="min-w-0 flex-1 basis-40 font-medium">{line.name}</span>
                      <QuantityControl
                        line={line}
                        onQuantity={(q) =>
                          updateFree(
                            free.map((f) =>
                              f.itemId === line.itemId ? { ...f, ...withQuantity(q, f.unit) } : f,
                            ),
                          )
                        }
                        onUnit={(u) =>
                          updateFree(
                            free.map((f) =>
                              f.itemId === line.itemId ? { ...f, ...withUnit(f, u) } : f,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => updateFree(free.filter((f) => f.itemId !== line.itemId))}
                        aria-label={`Retirer ${line.name}`}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
