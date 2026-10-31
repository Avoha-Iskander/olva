"use client";

import { Camera, ChefHat, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Choix de la photo d'illustration. Sur téléphone, le sélecteur propose
 * l'appareil photo ou la galerie. La compression a lieu à l'enregistrement.
 */
export function PhotoPicker({
  currentUrl,
  file,
  removed,
  onFileChange,
  onRemove,
}: {
  currentUrl: string | null;
  file: File | null;
  removed: boolean;
  onFileChange: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Aperçu local du fichier choisi : une adresse temporaire, libérée quand le fichier change
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shown = previewUrl ?? (removed ? null : currentUrl);

  return (
    <div className="grid gap-3">
      <div className="bg-secondary flex aspect-[4/3] w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Photo de la recette" className="size-full object-cover" />
        ) : (
          <ChefHat className="text-secondary-foreground/50 size-12" aria-hidden="true" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choisir une photo"
        onChange={(e) => {
          const chosen = e.target.files?.[0];
          if (chosen) onFileChange(chosen);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <Camera />
          {shown ? "Changer la photo" : "Ajouter une photo"}
        </Button>
        {shown && (
          <Button type="button" variant="ghost" onClick={onRemove}>
            <X />
            Retirer
          </Button>
        )}
      </div>
    </div>
  );
}
