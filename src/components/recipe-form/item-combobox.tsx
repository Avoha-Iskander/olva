"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CatalogueItem } from "@/lib/catalogue";
import { searchItems } from "@/lib/catalogue-search";
import { normalizeText } from "@/lib/text";
import { cn } from "@/lib/utils";

type ItemComboboxProps = {
  items: CatalogueItem[];
  selectedId: string | null;
  selectedName: string;
  onSelect: (item: CatalogueItem) => void;
  onCreate: (name: string) => void;
  invalid?: boolean;
  id?: string;
};

/**
 * Champ « Article » avec auto-complétion dans le catalogue.
 * Si l'article n'existe pas, propose de le créer (« Créer “Piment” »).
 */
export function ItemCombobox({
  items,
  selectedId,
  selectedName,
  onSelect,
  onCreate,
  invalid,
  id,
}: ItemComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const exactMatch = results.some((i) => normalizeText(i.name) === normalizeText(query));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn(
            "w-full justify-between font-normal",
            !selectedId && "text-muted-foreground",
            invalid && "border-destructive",
          )}
        >
          <span className="truncate">{selectedId ? selectedName : "Choisir un article…"}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-64">
        {/* shouldFilter={false} : c'est nous qui filtrons (sans accents) */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher (ex. tomate)"
          />
          <CommandList>
            <CommandEmpty>Aucun article trouvé.</CommandEmpty>
            {results.length > 0 && (
              <CommandGroup>
                {results.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onSelect(item);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn("size-4", item.id === selectedId ? "opacity-100" : "opacity-0")}
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.isPersonal && (
                      <span className="text-muted-foreground text-xs">perso</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {query.trim() && !exactMatch && (
              <CommandGroup heading="Absent du catalogue ?">
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={() => {
                    onCreate(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Plus className="size-4" />
                  Créer « {query.trim()} »
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
