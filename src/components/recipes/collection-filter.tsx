"use client";

import { cn } from "@/lib/utils";

/**
 * Pastilles de filtre par collection (US-REC-04, décision 079). Le filtre s'applique dans
 * le navigateur, instantanément : la page n'est pas rechargée, les photos non plus.
 */
export function CollectionFilter({
  collections,
  activeId,
  onChange,
}: {
  collections: { id: string; name: string }[];
  activeId: string | null;
  onChange: (collectionId: string | null) => void;
}) {
  if (collections.length === 0) return null;

  const chip =
    "flex h-9 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors";
  const options = [{ id: null, name: "Toutes" }, ...collections];
  return (
    <nav aria-label="Filtrer par collection" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        {options.map((c) => (
          <li key={c.id ?? "toutes"}>
            <button
              type="button"
              onClick={() => onChange(c.id)}
              aria-pressed={activeId === c.id}
              className={cn(
                chip,
                activeId === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
