/** En-tête des étapes de création d'une liste : titre + « Étape 2 sur 3 · … ». */
export function StepHeader({
  step,
  title,
  subtitle,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        Étape {step} sur 3 · {subtitle}
      </p>
    </div>
  );
}
