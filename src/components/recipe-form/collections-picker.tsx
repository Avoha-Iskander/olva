"use client";

import { Check, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { createCollection } from "@/app/(app)/recettes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Collection = { id: string; name: string };

/** Choix des collections (pastilles à cocher) et création d'une nouvelle. */
export function CollectionsPicker({
  collections,
  selectedIds,
  onChange,
  onCollectionCreated,
}: {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCollectionCreated: (collection: Collection) => void;
}) {
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  function create() {
    startTransition(async () => {
      const result = await createCollection(newName);
      if (!result.ok) return setMessage(result.message);
      onCollectionCreated(result.collection);
      if (!selectedIds.includes(result.collection.id)) {
        onChange([...selectedIds, result.collection.id]);
      }
      setNewName("");
      setMessage(undefined);
    });
  }

  return (
    <div className="grid gap-3">
      {collections.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {collections.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  {selected && <Check className="size-4" />}
                  {c.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouvelle collection"
          aria-label="Nom de la nouvelle collection"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (newName.trim()) create();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={create}
          disabled={!newName.trim() || pending}
        >
          <Plus />
          Créer
        </Button>
      </div>
      {message && <p className="text-destructive text-sm">{message}</p>}
    </div>
  );
}
