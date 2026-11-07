"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CardAction = {
  label: string;
  Icon: LucideIcon;
  href?: string; // un lien…
  onClick?: () => void; // …ou un bouton
  destructive?: boolean; // en rouge (Supprimer)
};

/**
 * Bouton ⋯ (ordinateur) d'une carte (recette, menu…) : apparaît au survol de la carte,
 * ou quand on y arrive au clavier (Tab). Sur les écrans tactiles sans souris, il reste
 * toujours visible. Il ouvre un petit menu d'actions (sur mobile : le glissement).
 */
export function CardActionsMenu({ label, actions }: { label: string; actions: CardAction[] }) {
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
          aria-label={label}
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
        {actions.map(({ label: name, Icon, href, onClick, destructive }) =>
          href ? (
            <Link key={name} href={href} className={item}>
              <Icon className="size-4" />
              {name}
            </Link>
          ) : (
            <button
              key={name}
              type="button"
              className={cn(item, destructive && "text-destructive")}
              onClick={() => {
                setOpen(false);
                onClick?.();
              }}
            >
              <Icon className="size-4" />
              {name}
            </button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
}
