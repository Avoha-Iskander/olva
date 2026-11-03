import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Encadré « À vérifier » d'un brouillon importé par photo (US-REC-02).
 * Fond ambre ET mention écrite : l'information ne repose pas sur la couleur seule.
 * Sans `active`, le contenu s'affiche normalement, sans encadré.
 */
export function ReviewHighlight({
  active,
  hint,
  children,
  className,
}: {
  active: boolean;
  hint?: React.ReactNode; // précision sous la mention, ex. « Lu sur la photo : … »
  children: React.ReactNode;
  className?: string;
}) {
  if (!active) return <>{children}</>;
  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg bg-amber-50 p-3 ring-2 ring-amber-400",
        "dark:bg-amber-950/40 dark:ring-amber-500",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-amber-900 dark:text-amber-200">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />À vérifier
      </p>
      {hint && <div className="text-sm text-amber-900 dark:text-amber-200">{hint}</div>}
      {children}
    </div>
  );
}
