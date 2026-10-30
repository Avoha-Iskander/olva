import * as React from "react";

import { cn } from "@/lib/utils";

// Champ de saisie shadcn/ui. Hauteur 44 px (h-11) pour le tactile.
// aria-invalid colore le champ en rouge quand il contient une erreur.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground flex h-11 w-full min-w-0 rounded-md border px-3 py-2 text-base transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
