"use client";

import { Check, Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { renameMenu } from "@/app/(app)/menus/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Nom du menu (titre de la page), modifiable : le crayon ouvre un champ,
 * « Entrée » ou la coche enregistre, « Échap » annule.
 */
export function MenuName({ menuId, initialName }: { menuId: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    const next = draft.trim();
    if (!next || next === name) {
      setDraft(name);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const { ok } = await renameMenu(menuId, next);
      setFailed(!ok);
      if (ok) {
        setName(next);
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight break-words">{name}</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label="Renommer le menu"
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
        save();
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          aria-label="Nom du menu"
          className="text-lg"
        />
        <Button type="submit" size="icon" disabled={pending} aria-label="Enregistrer le nom">
          <Check />
        </Button>
      </div>
      {failed && (
        <p role="alert" className="text-destructive text-sm">
          Le nom n&apos;a pas pu être enregistré. Réessayez.
        </p>
      )}
    </form>
  );
}
