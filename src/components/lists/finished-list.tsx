import { Check, Undo2 } from "lucide-react";

import { AisleHeading } from "@/components/lists/aisle-heading";
import { type ShoppingLine, progress, shoppingGroups } from "@/lib/shopping-lines";
import { formatQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";

/**
 * Récapitulatif d'une liste terminée (US-CRS-03), en lecture seule : ce qui a été pris,
 * et ce qui ne l'a pas été (reporté sur la liste suivante).
 */
export function FinishedList({ lines }: { lines: ShoppingLine[] }) {
  const { checked, total } = progress(lines);
  return (
    <div className="grid gap-6">
      <p className="text-sm font-medium">
        {checked} / {total} article{total > 1 ? "s" : ""} pris
        {total - checked > 0 &&
          ` · ${total - checked} reporté${total - checked > 1 ? "s" : ""} sur la liste suivante`}
      </p>
      {shoppingGroups(lines).map((group) => (
        <section key={group.aisle} className="grid gap-2" aria-label={group.aisle}>
          <AisleHeading>{group.aisle}</AisleHeading>
          <ul className="divide-border bg-card divide-y rounded-xl border">
            {group.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 px-4 py-3">
                {line.checked ? (
                  <Check className="text-primary size-5 shrink-0" aria-label="Pris" />
                ) : (
                  <Undo2 className="text-muted-foreground size-5 shrink-0" aria-label="Reporté" />
                )}
                <span className={cn("flex-1", !line.checked && "text-muted-foreground")}>
                  {line.name}
                </span>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {formatQuantity(line.quantity, line.unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
