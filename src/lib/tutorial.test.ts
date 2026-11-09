import { describe, expect, it } from "vitest";

import { BUBBLE_GAP, placeBubble, shouldAutoStartTutorial } from "@/lib/tutorial";

const phone = { width: 390, height: 844 };
const bubble = { width: 300, height: 160 };

describe("placeBubble", () => {
  it("centre la bulle sans élément à montrer", () => {
    expect(placeBubble(null, phone, bubble)).toEqual({ top: 342, left: 45 });
  });

  it("place la bulle au-dessus d'un élément en bas de l'écran (barre du bas)", () => {
    const tab = { top: 780, left: 0, width: 98, height: 64 };
    const { top, left } = placeBubble(tab, phone, bubble);
    expect(top).toBe(780 - BUBBLE_GAP - 160);
    expect(left).toBe(BUBBLE_GAP); // ne sort pas à gauche
  });

  it("place la bulle sous un élément en haut de l'écran (menu sur ordinateur)", () => {
    const link = { top: 8, left: 600, width: 120, height: 44 };
    const { top, left } = placeBubble(link, { width: 1280, height: 800 }, bubble);
    expect(top).toBe(8 + 44 + BUBBLE_GAP);
    expect(left).toBe(600 + 60 - 150);
  });

  it("ne sort jamais à droite", () => {
    const tab = { top: 780, left: 292, width: 98, height: 64 };
    expect(placeBubble(tab, phone, bubble).left).toBe(390 - 300 - BUBBLE_GAP);
  });
});

describe("shouldAutoStartTutorial", () => {
  it("se lance tant que le tutoriel n'a été ni terminé ni passé", () => {
    expect(shouldAutoStartTutorial(null)).toBe(true);
    expect(shouldAutoStartTutorial("completed")).toBe(false);
    expect(shouldAutoStartTutorial("skipped")).toBe(false);
  });
});
