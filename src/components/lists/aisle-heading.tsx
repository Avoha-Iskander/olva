"use client";

import { useAisleEmojis } from "@/components/lists/aisle-emojis";

/**
 * Titre d'un rayon au-dessus d'un groupe d'articles (« 🥦 FRUITS ET LÉGUMES »).
 * L'emoji vient du contexte des rayons (US-CAT-06) ; il est décoratif, donc masqué
 * aux lecteurs d'écran (aria-hidden), qui lisent seulement le nom.
 */
export function AisleHeading({ aisle, suffix }: { aisle: string; suffix?: string }) {
  const emoji = useAisleEmojis()[aisle];
  return (
    <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
      {emoji && (
        <span aria-hidden="true" className="text-base leading-none">
          {emoji}
        </span>
      )}
      <span>
        {aisle}
        {suffix}
      </span>
    </h3>
  );
}
