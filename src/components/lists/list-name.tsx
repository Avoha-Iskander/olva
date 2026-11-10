"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";

import { renameList } from "@/app/(app)/listes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Titre d'une liste, avec un crayon pour la renommer (US-LST-11).
 * « Entrée » ou la coche enregistre, « Échap » ou la croix annule ; un nom vide remet
 * le titre par défaut (« Liste du [date] »).
 */
export function ListName({
  listId,
  title,
  name,
}: {
  listId: string;
  title: string; // titre affiché (nom choisi ou date)
  name: string | null; // nom choisi, prérempli dans le champ
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setDraft(name ?? "");
    setEditing(false);
    setFailed(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight break-words first-letter:uppercase">
          {title}
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label="Renommer la liste"
        >
          <Pencil />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const { ok } = await renameList(listId, draft);
          setFailed(!ok);
          if (ok) setEditing(false); // la page se met à jour avec le nouveau nom
        });
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={draft}
          maxLength={60}
          placeholder={title}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && cancel()}
          aria-label="Nom de la liste"
          className="text-lg"
        />
        <Button type="submit" size="icon" disabled={pending} aria-label="Enregistrer le nom">
          <Check />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={cancel} aria-label="Annuler">
          <X />
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">Laissez vide pour reprendre la date.</p>
      {failed && (
        <p role="alert" className="text-destructive text-sm">
          Le nom n&apos;a pas pu être enregistré. Réessayez.
        </p>
      )}
    </form>
  );
}
