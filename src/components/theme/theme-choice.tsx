"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState, useTransition } from "react";

import { updateTheme } from "@/app/(app)/parametres/actions";
import { applyTheme } from "@/components/theme/apply-theme";
import { THEME_LABELS, THEMES, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * Paramètres → Apparence (US-CPT-05) : Automatique / Clair / Sombre.
 * Le thème change tout de suite à l'écran, puis est enregistré dans le profil.
 */
export function ThemeChoice({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  function choose(next: Theme) {
    const previous = theme;
    setTheme(next);
    applyTheme(next);
    startTransition(async () => {
      const { ok } = await updateTheme(next);
      setFailed(!ok);
      if (!ok) {
        // Pas enregistré : on revient au choix précédent
        setTheme(previous);
        applyTheme(previous);
      }
    });
  }

  return (
    <div className="grid gap-2">
      <div
        role="radiogroup"
        aria-label="Apparence"
        className="bg-muted grid grid-cols-3 gap-1 rounded-lg p-1"
      >
        {THEMES.map((value) => {
          const Icon = ICONS[value];
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => choose(value)}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                theme === value
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {THEME_LABELS[value]}
            </button>
          );
        })}
      </div>
      {failed && (
        <p role="alert" className="text-destructive text-sm">
          Le choix n&apos;a pas pu être enregistré. Réessayez.
        </p>
      )}
    </div>
  );
}
