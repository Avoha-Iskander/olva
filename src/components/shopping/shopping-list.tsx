"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { reloadShoppingLines, setLineChecked, startShopping } from "@/app/(app)/courses/actions";
import { addListLine } from "@/app/(app)/listes/actions";
import { AisleHeading } from "@/components/lists/aisle-heading";
import { ItemCombobox } from "@/components/recipe-form/item-combobox";
import { NewItemDialog } from "@/components/recipe-form/new-item-dialog";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import type { ListStatus } from "@/lib/lists";
import {
  applyChange,
  type LineChange,
  progress,
  setChecked,
  type ShoppingLine,
  shoppingGroups,
} from "@/lib/shopping-lines";
import { createClient } from "@/lib/supabase/client";
import { formatQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";

type Props = {
  listId: string;
  status: ListStatus;
  userId: string | null;
  initialLines: ShoppingLine[];
  initialNames: Record<string, string>; // noms des personnes qui ont coché
  catalogue: CatalogueItem[];
  aisles: Aisle[];
};

/**
 * Écran de courses (US-CRS-01, US-CRS-02) : la liste par rayon, des cases larges.
 * Temps réel : l'écran s'abonne aux changements des lignes de CETTE liste (Supabase
 * Realtime). Une coche faite sur un autre téléphone apparaît ici aussitôt.
 * Affichage immédiat : ma coche s'affiche avant la réponse du serveur, et revient en
 * arrière si l'enregistrement échoue.
 */
export function ShoppingList(props: Props) {
  const { listId, userId } = props;
  const router = useRouter();
  const [lines, setLinesState] = useState(props.initialLines);
  // Copie toujours à jour des lignes : les changements reçus en temps réel sont calculés
  // à partir d'elle (la fonction passée à setState peut s'exécuter plus tard)
  const linesRef = useRef(props.initialLines);
  const setLines = (next: ShoppingLine[]) => {
    linesRef.current = next;
    setLinesState(next);
  };
  const [names, setNamesState] = useState(props.initialNames);
  const namesRef = useRef(props.initialNames);
  const setNames = (next: Record<string, string>) => {
    namesRef.current = next;
    setNamesState(next);
  };
  const [items, setItems] = useState(props.catalogue);
  const [newItemName, setNewItemName] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Abonnement au temps réel actif ? (repère data-realtime, utilisé par les tests)
  const [live, setLive] = useState(false);
  const [adding, startAdding] = useTransition();

  // Relecture complète : ajout venu d'ailleurs, ou retour après une coupure
  const reload = useRef(async () => {
    const fresh = await reloadShoppingLines(listId);
    if (fresh) {
      setLines(fresh.lines);
      setNames(fresh.names);
    }
  });

  // Ouvrir une liste prête la fait passer « en courses » (une seule fois)
  useEffect(() => {
    if (props.status === "ready") void startShopping(listId);
  }, [listId, props.status]);

  useEffect(() => {
    const supabase = createClient();
    let subscribedOnce = false;
    const channel = supabase
      .channel(`courses:${listId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_list_items",
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          const change = { eventType: payload.eventType, new: payload.new, old: payload.old };
          // Le contenu reçu correspond aux colonnes de shopping_list_items (cf. LineChange)
          const result = applyChange(linesRef.current, change as unknown as LineChange);
          setLines(result.lines);
          // Coche d'une personne dont on ne connaît pas encore le nom : on relit aussi
          const checker = (payload.new as { checked_by?: string | null })?.checked_by;
          const unknownChecker = checker && checker !== userId && !namesRef.current[checker];
          if (result.needsReload || unknownChecker) void reload.current();
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        if (status !== "SUBSCRIBED") return;
        // Réabonnement après une coupure : des changements ont pu être manqués
        if (subscribedOnce) void reload.current();
        subscribedOnce = true;
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [listId, userId]);

  async function toggle(line: ShoppingLine) {
    const value = !line.checked;
    setFailed(false);
    setLines(setChecked(linesRef.current, line.id, value, userId));
    const { ok } = await setLineChecked(line.id, value);
    if (!ok) {
      // Échec : la case revient en arrière
      setLines(setChecked(linesRef.current, line.id, !value, userId));
      setFailed(true);
    }
  }

  function add(item: CatalogueItem) {
    startAdding(async () => {
      const { ok } = await addListLine(listId, item.id, {
        quantity: 1,
        unit: item.purchaseUnit ?? item.defaultUnit,
      });
      setFailed(!ok);
      if (ok) {
        await reload.current();
        router.refresh();
      }
    });
  }

  const { checked, total } = progress(lines);
  const groups = shoppingGroups(lines);

  return (
    <div className="grid gap-6" data-realtime={live ? "connecte" : "deconnecte"}>
      {/* Progression : reste visible en haut pendant qu'on fait défiler */}
      <div className="bg-background/95 sticky top-0 z-10 -mx-4 grid gap-2 border-b px-4 py-3 backdrop-blur">
        <p className="text-sm font-medium" aria-live="polite">
          {checked === total && total > 0
            ? "Tout est dans le panier !"
            : `${checked} / ${total} article${total > 1 ? "s" : ""} dans le panier`}
        </p>
        <div
          className="bg-muted h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="Progression des courses"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={checked}
        >
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: total ? `${(checked / total) * 100}%` : "0%" }}
          />
        </div>
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            L&apos;enregistrement a échoué. Vérifiez votre connexion et réessayez.
          </p>
        )}
      </div>

      {lines.length === 0 && (
        <p className="text-muted-foreground py-6 text-center text-sm">La liste est vide.</p>
      )}

      {groups.map((group) => (
        <section key={group.aisle} className="grid gap-2" aria-label={group.aisle}>
          <AisleHeading>
            {group.aisle}
            {group.remaining === 0 && " · fini"}
          </AisleHeading>
          <ul className="divide-border bg-card divide-y rounded-xl border">
            {group.lines.map((line) => {
              const checkedBy =
                line.checked && line.checkedBy && line.checkedBy !== userId
                  ? (names[line.checkedBy] ?? "quelqu'un")
                  : null;
              return (
                <li key={line.id}>
                  {/* Toute la ligne est cliquable : grande cible, utilisable d'une main */}
                  <label className="flex min-h-14 cursor-pointer items-center gap-4 px-4 py-3 select-none">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={line.checked}
                      onChange={() => void toggle(line)}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        "peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]",
                        line.checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {line.checked && <Check className="size-5" strokeWidth={3} />}
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span
                        className={cn(
                          "font-medium",
                          line.checked && "text-muted-foreground line-through",
                        )}
                      >
                        {line.name}
                      </span>
                      {checkedBy && (
                        <span className="text-muted-foreground text-xs">coché par {checkedBy}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm tabular-nums",
                        line.checked ? "text-muted-foreground" : "font-medium",
                      )}
                    >
                      {formatQuantity(line.quantity, line.unit)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="grid gap-2">
        <p className="text-sm font-medium">Un oubli ?</p>
        <ItemCombobox
          items={items}
          selectedId={null}
          selectedName=""
          placeholder={adding ? "Ajout…" : "Ajouter un article…"}
          onSelect={add}
          onCreate={setNewItemName}
        />
      </div>

      <NewItemDialog
        key={newItemName ?? "closed"}
        open={newItemName !== null}
        initialName={newItemName ?? ""}
        aisles={props.aisles}
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
