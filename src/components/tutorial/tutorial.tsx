"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { saveTutorialProgress } from "@/app/(app)/parametres/actions";
import {
  TUTORIAL_FINAL_HREF,
  TUTORIAL_STEPS,
  type TutorialStep,
} from "@/components/tutorial/tutorial-steps";
import { Button } from "@/components/ui/button";
import { type Box, placeBubble } from "@/lib/tutorial";

/** Événement envoyé par le bouton « Revoir le tutoriel » des Paramètres. */
export const START_TUTORIAL_EVENT = "olva:start-tutorial";

const SPOTLIGHT_PADDING = 6; // marge autour de l'élément mis en surbrillance

/** Élément visible portant `data-tour="…"` (sur ordinateur, le menu du haut ; sur mobile, celui du bas). */
function findTarget(step: TutorialStep): Box | null {
  if (!step.target) return null;
  const elements = document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`);
  for (const element of elements) {
    const r = element.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return {
        top: r.top - SPOTLIGHT_PADDING,
        left: r.left - SPOTLIGHT_PADDING,
        width: r.width + SPOTLIGHT_PADDING * 2,
        height: r.height + SPOTLIGHT_PADDING * 2,
      };
    }
  }
  return null;
}

/**
 * Tutoriel de prise en main (US-CPT-06) : une bienvenue, puis une visite guidée sur
 * la vraie interface. L'écran est assombri, sauf l'élément expliqué (« projecteur »),
 * et une bulle donne l'explication.
 *
 * Le projecteur est un rectangle transparent entouré d'une ombre immense
 * (`box-shadow: 0 0 0 9999px`) : c'est l'ombre qui assombrit tout le reste de l'écran.
 */
export function Tutorial({ autoStart }: { autoStart: boolean }) {
  const router = useRouter();
  const [index, setIndex] = useState<number | null>(null); // null = fermé
  const [target, setTarget] = useState<Box | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const step = index === null ? null : TUTORIAL_STEPS[index];
  const isLast = index === TUTORIAL_STEPS.length - 1;

  // Lancement : tout seul la première fois, ou depuis les Paramètres
  useEffect(() => {
    const start = () => setIndex(0);
    window.addEventListener(START_TUTORIAL_EVENT, start);
    // Petit délai : laisse la page s'afficher avant d'assombrir l'écran
    const timer = autoStart ? window.setTimeout(start, 400) : undefined;
    return () => {
      window.removeEventListener(START_TUTORIAL_EVENT, start);
      window.clearTimeout(timer);
    };
  }, [autoStart]);

  // Position de l'élément et de la bulle : recalculée à chaque étape et si l'écran change
  const measure = useCallback(() => {
    if (!step) return;
    const box = findTarget(step);
    setTarget(box);
    const bubble = bubbleRef.current;
    if (bubble) {
      setPosition(
        placeBubble(
          box,
          { width: window.innerWidth, height: window.innerHeight },
          { width: bubble.offsetWidth, height: bubble.offsetHeight },
        ),
      );
    }
  }, [step]);

  // Mesure à l'image suivante (requestAnimationFrame) : la bulle de la nouvelle étape
  // est alors affichée, on connaît donc sa vraie hauteur
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure]);

  useEffect(() => {
    if (index === null) return;
    titleRef.current?.focus(); // lecteurs d'écran et clavier : on lit la nouvelle bulle
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [index, measure]);

  const close = useCallback(
    (status: "completed" | "skipped") => {
      if (index === null) return;
      setIndex(null);
      // Enregistré pour la phase de test : terminé ou passé, et à quelle étape (1 = bienvenue)
      void saveTutorialProgress(status, index + 1);
    },
    [index],
  );

  // Échap : passer le tutoriel
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close("skipped");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close]);

  if (index === null || !step) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      {/* Fond qui bloque les clics ; assombri seulement quand rien n'est mis en surbrillance */}
      <div className={target ? "absolute inset-0" : "absolute inset-0 bg-black/60"} />
      {target && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-white/80 transition-all duration-300"
          style={{
            top: target.top,
            left: target.left,
            width: target.width,
            height: target.height,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.6)",
          }}
        />
      )}

      <div
        ref={bubbleRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-text"
        className="bg-card text-card-foreground absolute grid w-[min(20rem,calc(100vw-1.5rem))] gap-3 rounded-xl border p-4 shadow-lg transition-all duration-300"
        style={{ top: position.top, left: position.left }}
      >
        <p className="text-muted-foreground text-xs">
          {index + 1} / {TUTORIAL_STEPS.length}
        </p>
        <h2
          id="tutorial-title"
          ref={titleRef}
          tabIndex={-1}
          className="text-lg font-semibold outline-none"
        >
          {step.title}
        </h2>
        <p id="tutorial-text" className="text-sm">
          {step.text}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {isLast ? (
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                close("completed");
                router.push(TUTORIAL_FINAL_HREF);
              }}
            >
              Ajouter ma première recette
            </Button>
          ) : (
            <Button type="button" className="flex-1" onClick={() => setIndex(index + 1)}>
              {index === 0 ? "C'est parti" : "Suivant"}
            </Button>
          )}
          {index > 0 && (
            <Button type="button" variant="outline" onClick={() => setIndex(index - 1)}>
              Précédent
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground justify-self-center"
          onClick={() => close(isLast ? "completed" : "skipped")}
        >
          {isLast ? "Plus tard" : "Passer le tutoriel"}
        </Button>
      </div>
    </div>
  );
}
