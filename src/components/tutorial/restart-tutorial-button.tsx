"use client";

import { GraduationCap } from "lucide-react";

import { START_TUTORIAL_EVENT } from "@/components/tutorial/tutorial";
import { Button } from "@/components/ui/button";

/**
 * Paramètres → « Revoir le tutoriel » (US-CPT-06). Le tutoriel est déjà présent sur
 * toutes les pages (gabarit de l'app) : on lui envoie simplement un « événement »
 * pour qu'il démarre, sans changer de page.
 */
export function RestartTutorialButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.dispatchEvent(new Event(START_TUTORIAL_EVENT))}
    >
      <GraduationCap />
      Revoir le tutoriel
    </Button>
  );
}
