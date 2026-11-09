/**
 * Placement de la bulle du tutoriel (US-CPT-06). Fonction pure, testée.
 *
 * La bulle se place sous l'élément mis en surbrillance s'il y a la place, sinon
 * au-dessus (la barre du bas, sur mobile, est en bas de l'écran). Elle ne sort
 * jamais de l'écran. Sans élément : elle est centrée.
 */
export type Box = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };

export const BUBBLE_GAP = 12; // espace entre l'élément et la bulle, et avec les bords

export function placeBubble(
  target: Box | null,
  viewport: Size,
  bubble: Size,
): { top: number; left: number } {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), Math.max(min, max));
  const maxLeft = viewport.width - bubble.width - BUBBLE_GAP;
  const maxTop = viewport.height - bubble.height - BUBBLE_GAP;

  if (!target) {
    return {
      top: clamp((viewport.height - bubble.height) / 2, BUBBLE_GAP, maxTop),
      left: clamp((viewport.width - bubble.width) / 2, BUBBLE_GAP, maxLeft),
    };
  }

  const left = clamp(target.left + target.width / 2 - bubble.width / 2, BUBBLE_GAP, maxLeft);
  const below = target.top + target.height + BUBBLE_GAP;
  const fitsBelow = below + bubble.height + BUBBLE_GAP <= viewport.height;
  const top = fitsBelow ? below : target.top - BUBBLE_GAP - bubble.height;
  return { top: clamp(top, BUBBLE_GAP, maxTop), left };
}

/** Le tutoriel se lance tout seul tant qu'il n'a été ni terminé ni passé. */
export function shouldAutoStartTutorial(status: string | null | undefined): boolean {
  return status !== "completed" && status !== "skipped";
}
