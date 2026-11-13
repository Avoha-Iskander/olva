"use client";

import { Printer } from "lucide-react";

import { AisleHeading } from "@/components/lists/aisle-heading";
import { Button } from "@/components/ui/button";
import type { shoppingGroups } from "@/lib/shopping-lines";
import { formatQuantity } from "@/lib/units";

/**
 * « Imprimer la liste » (mode courses, réservé aux comptes qui ont la fonctionnalité
 * print_shopping_list, décision 082).
 *
 * Le bouton lance l'impression du navigateur (window.print). Ce qui sort sur le papier :
 * la version ci-dessous, invisible à l'écran (`hidden print:block`), alors que l'écran
 * interactif est masqué à l'impression (`print:hidden`). Elle suit l'état de la liste
 * au moment d'imprimer : les articles déjà cochés sont barrés.
 */
export function PrintShoppingListButton() {
  return (
    <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>
      <Printer />
      Imprimer la liste
    </Button>
  );
}

export function PrintableShoppingList({ groups }: { groups: ReturnType<typeof shoppingGroups> }) {
  return (
    <section className="print-sheet hidden print:block" aria-hidden="true">
      <div className="columns-2 gap-8">
        {groups.map((group) => (
          <div key={group.aisle} className="mb-4 break-inside-avoid">
            <AisleHeading aisle={group.aisle} />
            <ul className="mt-1">
              {group.lines.map((line) => (
                <li key={line.id} className="flex items-baseline gap-2 py-0.5 text-sm">
                  {/* Case à cocher au stylo : vide, ou cochée si déjà dans le panier */}
                  <span className="inline-block size-3 shrink-0 border border-black text-center text-[9px] leading-[10px]">
                    {line.checked ? "✓" : ""}
                  </span>
                  <span className={line.checked ? "text-gray-500 line-through" : ""}>
                    {line.name}
                  </span>
                  <span className="ml-auto pl-2 whitespace-nowrap text-gray-600">
                    {formatQuantity(line.quantity, line.unit)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
