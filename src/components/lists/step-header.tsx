/**
 * En-tête des étapes de préparation d'une liste : titre + « Étape 1 sur 2 · … ».
 * Liste sans recette (US-LST-08) : une seule étape, on n'affiche que le sous-titre.
 */
export function StepHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        {total > 1 ? `Étape ${step} sur ${total} · ${subtitle}` : subtitle}
      </p>
    </div>
  );
}
