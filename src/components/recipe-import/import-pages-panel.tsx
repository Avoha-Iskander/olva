"use client";

import { BookOpen } from "lucide-react";

/**
 * Les pages photographiées, affichées à côté du formulaire pour comparer en relisant
 * (US-REC-02). Ordinateur : colonne à droite, qui reste visible en défilant.
 * Mobile : bandeau repliable en haut, pour ne pas occuper tout l'écran.
 * Les images sont les aperçus locaux du navigateur : rien n'est retéléchargé.
 */
export function ImportPagesPanel({ pageUrls }: { pageUrls: string[] }) {
  const pages = pageUrls.map((url, index) => (
    <figure key={url} className="grid gap-1">
      {/* Aperçu local (adresse blob:), pas besoin de l'optimiseur d'images */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Page ${index + 1} de la recette`} className="w-full rounded-lg border" />
      {pageUrls.length > 1 && (
        <figcaption className="text-muted-foreground text-xs">Page {index + 1}</figcaption>
      )}
    </figure>
  ));
  const title =
    pageUrls.length > 1 ? `Pages photographiées (${pageUrls.length})` : "Page photographiée";

  return (
    <>
      {/* Mobile : repliable */}
      <details className="rounded-xl border lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-medium">
          <BookOpen className="size-4" aria-hidden />
          {title}
        </summary>
        <div className="grid gap-3 p-3 pt-0">{pages}</div>
      </details>
      {/* Ordinateur : colonne fixe pendant le défilement */}
      <aside
        aria-label={title}
        className="hidden max-h-[calc(100vh-2rem)] gap-3 overflow-y-auto lg:grid"
      >
        <p className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="size-4" aria-hidden />
          {title}
        </p>
        {pages}
      </aside>
    </>
  );
}
