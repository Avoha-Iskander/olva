"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Bouton ⋯ (ordinateur) : apparaît au survol de la carte, ou quand on y arrive
 * au clavier (Tab). Sur les écrans tactiles sans souris, il reste toujours visible.
 * Il ouvre un petit menu « Modifier / Supprimer ».
 */
export function RecipeActionsMenu({
  recipeId,
  recipeTitle,
  onDelete,
}: {
  recipeId: string;
  recipeTitle: string;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const item =
    "flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-sm outline-none hover:bg-accent focus-visible:bg-accent";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Actions pour « ${recipeTitle} »`}
          className={cn(
            // Caché sur mobile (glissement à la place), visible au survol / au clavier sur ordinateur
            "hidden md:flex",
            "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100",
            "[@media(hover:none)]:opacity-100",
            open && "opacity-100",
          )}
        >
          <MoreHorizontal className="size-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <Link href={`/recettes/${recipeId}/modifier`} className={item}>
          <Pencil className="size-4" />
          Modifier
        </Link>
        <button
          type="button"
          className={cn(item, "text-destructive")}
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
        >
          <Trash2 className="size-4" />
          Supprimer
        </button>
      </PopoverContent>
    </Popover>
  );
}
