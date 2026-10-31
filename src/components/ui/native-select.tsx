import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Liste déroulante native du navigateur, au style d'Olva.
 * Sur téléphone, elle ouvre le sélecteur du système : simple et accessible.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full appearance-none rounded-md border pr-8 pl-3 text-base outline-none focus-visible:ring-[3px] disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  );
}

export { NativeSelect };
