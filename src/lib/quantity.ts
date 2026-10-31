/**
 * Lecture d'une quantité saisie au clavier, à la française :
 * « 2 » → 2 ; « 1,5 » → 1.5 ; « 1/2 » → 0.5 ; « 1 1/2 » → 1.5 ; vide → null (au goût).
 * Renvoie undefined si la saisie n'est pas un nombre valide.
 */
export function parseQuantity(input: string): number | null | undefined {
  const text = input.trim().replace(",", ".");
  if (text === "") return null;

  // Nombre mixte « 1 1/2 » ou fraction « 1/2 »
  const fraction = text.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const whole = fraction[1] ? Number(fraction[1]) : 0;
    const numerator = Number(fraction[2]);
    const denominator = Number(fraction[3]);
    if (denominator === 0) return undefined;
    const value = whole + numerator / denominator;
    return value > 0 ? value : undefined;
  }

  if (!/^\d*\.?\d+$/.test(text)) return undefined;
  const value = Number(text);
  return value > 0 ? value : undefined;
}

/** Affichage d'une quantité dans un champ : 1.5 → « 1,5 » ; null → « ». */
export function quantityToInput(value: number | null): string {
  if (value === null) return "";
  return String(Math.round(value * 1000) / 1000).replace(".", ",");
}
