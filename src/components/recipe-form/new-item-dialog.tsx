"use client";

import { useState, useTransition } from "react";

import { createItem } from "@/app/(app)/recettes/actions";
import { FormField } from "@/components/auth/form-field";
import { PURCHASE_UNIT_OPTIONS, UNIT_OPTIONS } from "@/components/recipe-form/units";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";

/**
 * Fenêtre « Nouvel article » : ajoute un article à mon catalogue (US-CAT-02).
 * Le formulaire parent lui donne une « key » différente à chaque ouverture :
 * React recrée alors le composant, et les champs repartent de zéro.
 */
export function NewItemDialog({
  open,
  initialName,
  aisles,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  initialName: string;
  aisles: Aisle[];
  onOpenChange: (open: boolean) => void;
  onCreated: (item: CatalogueItem) => void;
}) {
  const [name, setName] = useState(initialName);
  const [aisleId, setAisleId] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("g");
  const [isStaple, setIsStaple] = useState(false);
  const [purchaseUnit, setPurchaseUnit] = useState("paquet");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createItem({
        name,
        aisleId: Number(aisleId),
        defaultUnit,
        isStaple,
        purchaseUnit: isStaple ? purchaseUnit : null,
      });
      if (result.ok) {
        onCreated(result.item);
        onOpenChange(false);
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel article</DialogTitle>
          <DialogDescription>Il sera ajouté à votre catalogue personnel.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField
            label="Nom"
            name="new-item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <div className="grid gap-2">
            <Label htmlFor="new-item-aisle">Rayon</Label>
            <NativeSelect
              id="new-item-aisle"
              value={aisleId}
              onChange={(e) => setAisleId(e.target.value)}
              aria-invalid={errors.aisleId ? true : undefined}
            >
              <option value="" disabled>
                Choisir un rayon…
              </option>
              {aisles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
            {errors.aisleId && <p className="text-destructive text-sm">{errors.aisleId}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-item-unit">Unité habituelle dans les recettes</Label>
            <NativeSelect
              id="new-item-unit"
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
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={isStaple}
              onChange={(e) => setIsStaple(e.target.checked)}
              className="accent-primary mt-0.5 size-5"
            />
            <span>
              <span className="font-medium">Ingrédient de base</span>
              <span className="text-muted-foreground block">
                Comme l&apos;huile ou le sel : décoché par défaut dans la liste de courses.
              </span>
            </span>
          </label>
          {isStaple && (
            <div className="grid gap-2">
              <Label htmlFor="new-item-purchase">S&apos;achète par</Label>
              <NativeSelect
                id="new-item-purchase"
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
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Création…" : "Créer l'article"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
