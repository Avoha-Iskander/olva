/** Titre d'un rayon au-dessus d'un groupe d'articles (« FRUITS ET LÉGUMES »). */
export function AisleHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </h3>
  );
}
