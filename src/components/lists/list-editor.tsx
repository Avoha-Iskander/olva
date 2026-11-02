"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";

import { addListLine, removeListLine, updateListLine } from "@/app/(app)/listes/actions";
import { QuantityControl } from "@/components/lists/quantity-control";
import { ItemCombobox } from "@/components/recipe-form/item-combobox";
import { NewItemDialog } from "@/components/recipe-form/new-item-dialog";
import { Button } from "@/components/ui/button";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import type { ListLine } from "@/lib/lists";
import { normalizeUnit } from "@/lib/review";
import { convertQuantity, roundQuantity } from "@/lib/units";

/**
 * Page d'une liste prête : les articles par rayon (une ligne par article).
 * On peut changer une quantité ou une unité, retirer une ligne, ajouter un article.
 * Les changements de quantité sont enregistrés après une courte pause, ligne par ligne.
 */
export function ListEditor({
  listId,
  initialLines,
  catalogue,
  aisles,
}: {
  listId: string;
  initialLines: ListLine[];
  catalogue: CatalogueItem[];
  aisles: Aisle[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState(initialLines);
  const [items, setItems] = useState(catalogue);
  const [newItemName, setNewItemName] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, startAdding] = useTransition();
  // Un minuteur par ligne : modifier le lait n'annule pas l'enregistrement de la farine.
  // useState(() => …) crée la Map une seule fois ; on la modifie ensuite sans réafficher.
  const [timers] = useState(() => new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    return () => timers.forEach((t) => clearTimeout(t));
  }, [timers]);

  function changeLine(line: ListLine, quantity: number, unit: string) {
    setLines((list) => list.map((l) => (l.id === line.id ? { ...l, quantity, unit } : l)));
    const previous = timers.get(line.id);
    if (previous) clearTimeout(previous);
    timers.set(
      line.id,
      setTimeout(async () => {
        const { ok } = await updateListLine(line.id, { quantity, unit });
        setFailed(!ok);
      }, 600),
    );
  }

  async function remove(line: ListLine) {
    setLines((list) => list.filter((l) => l.id !== line.id));
    const { ok } = await removeListLine(line.id);
    setFailed(!ok);
  }

  function add(item: CatalogueItem) {
    startAdding(async () => {
      const { ok } = await addListLine(listId, item.id, {
        quantity: 1,
        unit: item.purchaseUnit ?? item.defaultUnit,
      });
      setFailed(!ok);
      // La page est relue côté serveur : la ligne ajoutée (ou augmentée) apparaît
      if (ok) router.refresh();
    });
  }

  // Regroupement par rayon pour l'affichage (les lignes arrivent déjà triées)
  const byAisle: { aisle: string; lines: ListLine[] }[] = [];
  for (const line of lines) {
    const group = byAisle.at(-1);
    if (group?.aisle === line.aisleName) group.lines.push(line);
    else byAisle.push({ aisle: line.aisleName, lines: [line] });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <ItemCombobox
          items={items}
          selectedId={null}
          selectedName=""
          placeholder={adding ? "Ajout…" : "Ajouter un article…"}
          onSelect={add}
          onCreate={setNewItemName}
        />
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            L&apos;enregistrement a échoué. Vérifiez votre connexion.
          </p>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">La liste est vide.</p>
      ) : (
        byAisle.map((group) => (
          <section key={group.aisle} className="grid gap-2" aria-label={group.aisle}>
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              {group.aisle}
            </h2>
            <ul className="divide-border bg-card divide-y rounded-xl border">
              {group.lines.map((line) => (
                <li key={line.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-medium">{line.name}</p>
                    {line.recipeTitles.length > 0 && (
                      <p className="text-muted-foreground truncate text-xs">
                        {line.recipeTitles.join(", ")}
                      </p>
                    )}
                  </div>
                  <QuantityControl
                    line={line}
                    onQuantity={(q) => {
                      const next = normalizeUnit(q, line.unit);
                      changeLine(line, next.quantity, next.unit);
                    }}
                    onUnit={(unit) => {
                      const converted = convertQuantity(line.quantity, line.unit, unit);
                      changeLine(
                        line,
                        converted !== null ? roundQuantity(converted) : line.quantity,
                        unit,
                      );
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void remove(line)}
                    aria-label={`Retirer ${line.name}`}
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
          setItems((list) => [...list, item].sort((a, b) => a.name.localeCompare(b.name, "fr")));
          setNewItemName(null);
          add(item);
        }}
      />
    </div>
  );
}
