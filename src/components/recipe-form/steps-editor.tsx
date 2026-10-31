"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Liste des étapes : une zone de texte par étape, réordonnable. */
export function StepsEditor({
  steps,
  onChange,
}: {
  steps: string[];
  onChange: (steps: string[]) => void;
}) {
  const update = (index: number, value: string) =>
    onChange(steps.map((s, i) => (i === index ? value : s)));
  const move = (index: number, direction: -1 | 1) => {
    const next = [...steps];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      <ol className="grid gap-3">
        {steps.map((step, index) => (
          <li key={index} className="grid grid-cols-[2rem_1fr] gap-2">
            <span className="text-primary pt-2 text-center font-medium" aria-hidden="true">
              {index + 1}
            </span>
            <div className="grid gap-1">
              <Textarea
                value={step}
                onChange={(e) => update(index, e.target.value)}
                aria-label={`Étape ${index + 1}`}
                placeholder="Décrivez l'étape…"
              />
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Monter l'étape ${index + 1}`}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === steps.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Descendre l'étape ${index + 1}`}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(steps.filter((_, i) => i !== index))}
                  aria-label={`Supprimer l'étape ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        onClick={() => onChange([...steps, ""])}
      >
        <Plus />
        Ajouter une étape
      </Button>
    </div>
  );
}
