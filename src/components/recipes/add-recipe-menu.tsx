"use client";

import { Camera, PenLine, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Bouton « Ajouter » de Mes recettes : saisie à la main, ou depuis une photo (US-REC-02). */
export function AddRecipeMenu() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button>
          <Plus />
          <span>Ajouter</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-60 gap-1 p-1">
        <Button asChild variant="ghost" className="justify-start">
          <Link href="/recettes/nouvelle" onClick={() => setOpen(false)}>
            <PenLine />
            Saisir à la main
          </Link>
        </Button>
        <Button asChild variant="ghost" className="justify-start">
          <Link href="/recettes/import" onClick={() => setOpen(false)}>
            <Camera />
            Depuis une photo
          </Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
