"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { removePrelistItem, upsertPrelistItem } from "@/app/(app)/listes/actions";
import { AisleHeading } from "@/components/lists/aisle-heading";
import { QuantityControl } from "@/components/lists/quantity-control";
import { ItemCombobox } from "@/components/recipe-form/item-combobox";
import { NewItemDialog } from "@/components/recipe-form/new-item-dialog";
import { Button } from "@/components/ui/button";
import { groupByAisle } from "@/lib/aisles";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import type { ExtraItem } from "@/lib/lists";
import { normalizeUnit } from "@/lib/review";
import { convertQuantity, roundQuantity } from "@/lib/units";

type Amount = { quantity: number; unit: string };

/**
 * « Ma pré-liste » hors d'une liste (Mes listes → Ma pré-liste, US-LST-03) : mes achats
 * habituels, rangés par rayon. J'ajoute, je retire, je change la quantité habituelle ;
 * chaque changement est enregistré aussitôt (mêmes actions qu'à l'étape 3 d'une liste).
 */
export function PrelistManager({
  catalogue,
  aisles,
  initialPrelist,
}: {
  catalogue: CatalogueItem[];
  aisles: Aisle[];
  initialPrelist: ExtraItem[];
}) {
  const [items, setItems] = useState(catalogue);
  const [prelist, setPrelist] = useState(initialPrelist);
  const [newItemName, setNewItemName] = useState<string | null>(null);

  function changeUsual(entry: ExtraItem, amount: Amount) {
    setPrelist((list) => list.map((p) => (p.itemId === entry.itemId ? { ...p, ...amount } : p)));
    void upsertPrelistItem({ itemId: entry.itemId, ...amount });
  }

  function remove(entry: ExtraItem) {
    setPrelist((list) => list.filter((p) => p.itemId !== entry.itemId));
    void removePrelistItem(entry.itemId);
  }

  function add(item: CatalogueItem) {
    if (prelist.some((p) => p.itemId === item.id)) return;
    // Les rayons arrivent dans l'ordre du magasin : leur rang donne la position
    const index = aisles.findIndex((a) => a.id === item.aisleId);
    const entry: ExtraItem = {
      itemId: item.id,
      name: item.name,
      aisleName: aisles[index]?.name,
      aislePosition: index === -1 ? 99 : index + 1,
      quantity: 1,
      unit: item.purchaseUnit ?? item.defaultUnit,
    };
    setPrelist((list) => [...list, entry]);
    void upsertPrelistItem({ itemId: entry.itemId, quantity: entry.quantity, unit: entry.unit });
  }

  return (
    <div className="grid gap-4">
      <ItemCombobox
        items={items}
        selectedId={null}
        selectedName=""
        placeholder="Ajouter un article à ma pré-liste…"
        onSelect={add}
        onCreate={(name) => setNewItemName(name)}
      />

      {prelist.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          Votre pré-liste est vide. Ajoutez vos achats habituels : ils vous seront proposés à chaque
          nouvelle liste.
        </p>
      ) : (
        groupByAisle(prelist).map((group) => (
          <section key={group.aisle} className="grid gap-1.5" aria-label={group.aisle}>
            <AisleHeading aisle={group.aisle} />
            <ul className="divide-border bg-card divide-y rounded-xl border">
              {group.lines.map((entry) => (
                <li key={entry.itemId} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <span className="min-w-0 flex-1 basis-40">{entry.name}</span>
                  <QuantityControl
                    line={entry}
                    onQuantity={(q) => changeUsual(entry, normalizeUnit(q, entry.unit))}
                    onUnit={(unit) => {
                      // Nouvelle unité : quantité convertie si possible (1 l → 1 000 ml)
                      const converted = convertQuantity(entry.quantity, entry.unit, unit);
                      changeUsual(entry, {
                        quantity: converted !== null ? roundQuantity(converted) : entry.quantity,
                        unit,
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(entry)}
                    aria-label={`Retirer ${entry.name} de ma pré-liste`}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <NewItemDialog
        key={newItemName ?? "closed"}
        open={newItemName !== null}
        initialName={newItemName ?? ""}
        aisles={aisles}
        onOpenChange={(open) => !open && setNewItemName(null)}
        onCreated={(item) => {
          setItems((list) =>
            list.some((i) => i.id === item.id)
              ? list
              : [...list, item].sort((a, b) => a.name.localeCompare(b.name, "fr")),
          );
          add(item);
          setNewItemName(null);
        }}
      />
    </div>
  );
}
