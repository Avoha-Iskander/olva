"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw, Search, X } from "lucide-react";

import {
  addConversion,
  removeConversion,
  resetItemSettings,
  saveItemSettings,
} from "@/app/(app)/parametres/catalogue/actions";
import { FormMessage } from "@/components/auth/form-message";
import { PURCHASE_UNIT_OPTIONS, UNIT_OPTIONS } from "@/components/recipe-form/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import { searchItems } from "@/lib/catalogue-search";
import { parseQuantity } from "@/lib/quantity";
import { formatQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";

export type Override = {
  aisleId: number | null;
  isStaple: boolean | null;
  purchaseUnit: string | null;
};
export type Conversion = {
  id: string;
  itemId: string;
  mine: boolean; // false : conversion du catalogue commun (non modifiable)
  fromUnit: string;
  toUnit: string;
  factor: number;
};

/**
 * « Mon catalogue » (US-CAT-03) : je cherche un article, puis je change son rayon,
 * l'indicateur « ingrédient de base » et ses conversions. Pour un article commun,
 * c'est une personnalisation pour moi seul ; pour mon article, une modification.
 */
export function CatalogueManager({
  items,
  aisles,
  initialOverrides,
  initialConversions,
}: {
  items: CatalogueItem[];
  aisles: Aisle[];
  initialOverrides: Record<string, Override>;
  initialConversions: Conversion[];
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [conversions, setConversions] = useState(initialConversions);
  const [catalogue, setCatalogue] = useState(items);

  const results = useMemo(
    () => (query.trim() ? searchItems(catalogue, query).slice(0, 30) : []),
    [catalogue, query],
  );
  const selected = catalogue.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="grid gap-6">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un article (ex. tomate)"
          aria-label="Rechercher un article"
          className="pl-9"
        />
      </div>

      {results.length > 0 && (
        <ul className="divide-border bg-card divide-y rounded-xl border">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setQuery("");
                }}
                className="hover:bg-accent flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left"
              >
                <span className="flex-1">{item.name}</span>
                {item.isPersonal && <span className="text-muted-foreground text-xs">perso</span>}
                {overrides[item.id] && (
                  <span className="text-muted-foreground text-xs">personnalisé</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <ItemEditor
          // key : éditeur remis à zéro quand on change d'article
          key={selected.id}
          item={selected}
          aisles={aisles}
          override={overrides[selected.id]}
          conversions={conversions.filter((c) => c.itemId === selected.id)}
          onSaved={(next, override) => {
            setCatalogue((list) => list.map((i) => (i.id === next.id ? next : i)));
            setOverrides((map) => {
              const copy = { ...map };
              if (override) copy[next.id] = override;
              else delete copy[next.id];
              return copy;
            });
          }}
          onConversionsChange={(itemConversions) =>
            setConversions((list) => [
              ...list.filter((c) => c.itemId !== selected.id),
              ...itemConversions,
            ])
          }
          onClose={() => setSelectedId(null)}
        />
      ) : (
        !query.trim() && (
          <p className="text-muted-foreground text-sm">
            Cherchez un article pour changer son rayon, en faire un ingrédient de base, ou ajouter
            une conversion (ex. 1 boîte = 400 g).
          </p>
        )
      )}
    </div>
  );
}

function ItemEditor({
  item,
  aisles,
  override,
  conversions,
  onSaved,
  onConversionsChange,
  onClose,
}: {
  item: CatalogueItem;
  aisles: Aisle[];
  override: Override | undefined;
  conversions: Conversion[];
  onSaved: (item: CatalogueItem, override: Override | null) => void;
  onConversionsChange: (conversions: Conversion[]) => void;
  onClose: () => void;
}) {
  // Valeurs affichées : ma personnalisation si elle existe, sinon le catalogue
  const [name, setName] = useState(item.name);
  const [defaultUnit, setDefaultUnit] = useState(item.defaultUnit);
  const [aisleId, setAisleId] = useState(override?.aisleId ?? item.aisleId);
  const [isStaple, setIsStaple] = useState(override?.isStaple ?? item.isStaple);
  const [purchaseUnit, setPurchaseUnit] = useState(
    override?.purchaseUnit ?? item.purchaseUnit ?? "paquet",
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveItemSettings({
        itemId: item.id,
        aisleId,
        isStaple,
        purchaseUnit: isStaple ? purchaseUnit : null,
        ...(item.isPersonal ? { name, defaultUnit } : {}),
      });
      if (!result.ok) return setMessage({ ok: false, text: result.message });
      setMessage({ ok: true, text: "Enregistré." });
      if (item.isPersonal) {
        onSaved(
          {
            ...item,
            name,
            defaultUnit,
            aisleId,
            isStaple,
            purchaseUnit: isStaple ? purchaseUnit : null,
          },
          null,
        );
      } else {
        onSaved(item, { aisleId, isStaple, purchaseUnit: isStaple ? purchaseUnit : null });
      }
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetItemSettings(item.id);
      if (!result.ok) return setMessage({ ok: false, text: result.message });
      setAisleId(item.aisleId);
      setIsStaple(item.isStaple);
      setPurchaseUnit(item.purchaseUnit ?? "paquet");
      setMessage({ ok: true, text: "Valeurs du catalogue rétablies." });
      onSaved(item, null);
    });
  }

  return (
    <section className="bg-card grid gap-5 rounded-xl border p-4" aria-label={item.name}>
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 className="text-lg font-semibold">{item.name}</h2>
          <p className="text-muted-foreground text-sm">
            {item.isPersonal
              ? "Article de mon catalogue personnel"
              : "Article du catalogue commun : vos réglages ne valent que pour vous"}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
          <X />
        </Button>
      </div>

      {item.isPersonal && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="item-name">Nom</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-unit">Unité par défaut</Label>
            <NativeSelect
              id="item-unit"
              value={defaultUnit}
              onChange={(e) => setDefaultUnit(e.target.value)}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="item-aisle">Rayon</Label>
        <NativeSelect
          id="item-aisle"
          value={aisleId}
          onChange={(e) => setAisleId(Number(e.target.value))}
        >
          {aisles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.emoji ? `${a.emoji} ${a.name}` : a.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isStaple}
            onChange={(e) => setIsStaple(e.target.checked)}
            className="accent-primary size-5"
          />
          <span>
            Ingrédient de base
            <span className="text-muted-foreground block text-sm">
              Décoché par défaut dans la revue (huile, sel, épices…)
            </span>
          </span>
        </label>
        {isStaple && (
          <div className="grid gap-2">
            <Label htmlFor="item-purchase">S&apos;achète par</Label>
            <NativeSelect
              id="item-purchase"
              value={purchaseUnit}
              onChange={(e) => setPurchaseUnit(e.target.value)}
            >
              {PURCHASE_UNIT_OPTIONS.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </div>

      {message && (
        <FormMessage
          message={message.ok ? undefined : message.text}
          success={message.ok ? message.text : undefined}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {override && !item.isPersonal && (
          <Button type="button" variant="outline" onClick={reset} disabled={pending}>
            <RotateCcw />
            Rétablir le catalogue
          </Button>
        )}
      </div>

      <Conversions item={item} conversions={conversions} onChange={onConversionsChange} />
    </section>
  );
}

/** Conversions de l'article : celles du catalogue (lecture) et les miennes (ajout, suppression). */
function Conversions({
  item,
  conversions,
  onChange,
}: {
  item: CatalogueItem;
  conversions: Conversion[];
  onChange: (conversions: Conversion[]) => void;
}) {
  const [fromUnit, setFromUnit] = useState("boite");
  const [factor, setFactor] = useState("");
  const [toUnit, setToUnit] = useState(item.defaultUnit === "piece" ? "g" : item.defaultUnit);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    const value = parseQuantity(factor);
    if (typeof value !== "number" || value <= 0) return setError("Saisissez un nombre.");
    startTransition(async () => {
      const result = await addConversion({ itemId: item.id, fromUnit, toUnit, factor: value });
      if (!result.ok || !result.id) return setError(result.ok ? "Échec." : result.message);
      setError(null);
      setFactor("");
      onChange([
        ...conversions,
        { id: result.id, itemId: item.id, mine: true, fromUnit, toUnit, factor: value },
      ]);
    });
  }

  function remove(conversion: Conversion) {
    onChange(conversions.filter((c) => c.id !== conversion.id));
    void removeConversion(conversion.id);
  }

  return (
    <div className="grid gap-3 border-t pt-5">
      <div className="grid gap-0.5">
        <h3 className="font-medium">Conversions</h3>
        <p className="text-muted-foreground text-sm">
          Pour additionner des unités différentes (ex. 1 boîte = 400 g).
        </p>
      </div>
      {conversions.length > 0 && (
        <ul className="divide-border divide-y rounded-lg border">
          {conversions.map((c) => (
            <li key={c.id} className="flex min-h-11 items-center gap-3 px-3 py-1">
              <span className="flex-1 text-sm">
                {formatQuantity(1, c.fromUnit)} = {formatQuantity(c.factor, c.toUnit)}
              </span>
              {c.mine ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(c)}
                  aria-label="Supprimer cette conversion"
                >
                  <X />
                </Button>
              ) : (
                <span className="text-muted-foreground text-xs">catalogue</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap items-center gap-2" noValidate>
        <span className="text-sm">1</span>
        <NativeSelect
          value={fromUnit}
          onChange={(e) => setFromUnit(e.target.value)}
          aria-label="Unité de départ"
          className="w-28 text-sm"
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u.code} value={u.code}>
              {u.label}
            </option>
          ))}
        </NativeSelect>
        <span className="text-sm">=</span>
        <Input
          inputMode="decimal"
          value={factor}
          onChange={(e) => setFactor(e.target.value)}
          aria-label="Quantité"
          className="w-20 text-center"
          placeholder="400"
        />
        <NativeSelect
          value={toUnit}
          onChange={(e) => setToUnit(e.target.value)}
          aria-label="Unité d'arrivée"
          className={cn("w-28 text-sm")}
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u.code} value={u.code}>
              {u.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline" disabled={pending}>
          Ajouter
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
