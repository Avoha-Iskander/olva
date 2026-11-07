"use client";

import { Camera, Link2, PenLine, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { withMenuReturn } from "@/lib/menu-return";

const CHOICES = [
  { path: "/recettes/nouvelle", label: "Saisir à la main", Icon: PenLine },
  { path: "/recettes/import", label: "Depuis une photo", Icon: Camera }, // US-REC-02
  { path: "/recettes/lien", label: "Depuis un lien", Icon: Link2 }, // US-REC-07
] as const;

/**
 * Bouton « Ajouter » : saisie à la main, depuis une photo ou depuis un lien.
 * - Dans Mes recettes : de simples liens.
 * - Dans un menu (US-MEN-01, décision 064) : `beforeLeave` enregistre d'abord la
 *   sélection en cours et renvoie le menu auquel revenir avec la nouvelle recette.
 */
export function AddRecipeMenu({
  label = "Ajouter",
  variant = "default",
  beforeLeave,
}: {
  label?: string;
  variant?: "default" | "outline";
  beforeLeave?: () => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function go(path: string) {
    startTransition(async () => {
      const menuId = beforeLeave ? await beforeLeave() : null;
      setOpen(false);
      // Menu pas enregistré (erreur affichée par le formulaire) : on reste ici
      if (beforeLeave && !menuId) return;
      router.push(withMenuReturn(path, menuId));
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} disabled={pending}>
          <Plus />
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-60 gap-1 p-1">
        {CHOICES.map(({ path, label: choice, Icon }) =>
          // Mes recettes : de vrais liens (ouvrables dans un nouvel onglet)
          !beforeLeave ? (
            <Button key={path} asChild variant="ghost" className="justify-start">
              <Link href={path} onClick={() => setOpen(false)}>
                <Icon />
                {choice}
              </Link>
            </Button>
          ) : (
            <Button
              key={path}
              type="button"
              variant="ghost"
              className="justify-start"
              disabled={pending}
              onClick={() => go(path)}
            >
              <Icon />
              {choice}
            </Button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
}
