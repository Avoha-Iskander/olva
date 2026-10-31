import * as React from "react";

import { cn } from "@/lib/utils";

// Zone de texte sur plusieurs lignes (style des champs shadcn/ui).
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex min-h-20 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-[3px] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
