"use client";

import { Camera, ClipboardPaste, Link2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";

import { importRecipeFromUrl } from "@/app/(app)/recettes/import/actions";
import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { ModelPicker } from "@/components/recipe-import/model-picker";
import { saveImportDirectly } from "@/components/recipe-import/save-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFreshSession } from "@/hooks/use-fresh-session";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import { draftToForm, type ImportDraft } from "@/lib/import-draft";

type Props = {
  recipeId: string;
  userId: string;
  defaultServings: number;
  items: CatalogueItem[];
  aisles: Aisle[];
  collections: { id: string; name: string }[];
  models: { id: string; label: string }[];
};

/** Le presse-papiers ne « change » pas : rien à écouter. */
const noSubscription = () => () => {};

type Draft = NonNullable<React.ComponentProps<typeof RecipeForm>["draft"]>;

/** Photo du site (base64 renvoyé par le serveur) → fichier, comme une photo choisie soi-même. */
function photoToFile(photo: NonNullable<ImportDraft["photo"]>): File {
  const bytes = Uint8Array.from(atob(photo.data), (c) => c.charCodeAt(0));
  const extension = photo.mediaType.split("/")[1];
  return new File([bytes], `photo-du-site.${extension}`, { type: photo.mediaType });
}

/**
 * Import d'une recette depuis un lien (US-REC-07) : je colle l'adresse d'une page,
 * le serveur la lit, Claude en tire la recette, et le même brouillon surligné que pour
 * l'import photo s'ouvre, avec la photo du plat et le lien d'origine.
 */
/**
 * Point d'entrée : une session neuve (formulaire vierge, nouvel identifiant de recette)
 * à chaque retour sur l'écran (cf. useFreshSession).
 */
export function UrlImport(props: Omit<Props, "recipeId">) {
  const { key, recipeId } = useFreshSession();
  return <UrlImportFlow key={key} {...props} recipeId={recipeId} />;
}

function UrlImportFlow(props: Props) {
  const [url, setUrl] = useState("");
  const [model, setModel] = useState(props.models[0]?.id);
  const [error, setError] = useState<{
    message: string;
    importId: string | null;
    retry: boolean;
  }>();
  const [draft, setDraft] = useState<Draft>();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  // « Coller » n'existe que si le navigateur permet de lire le presse-papiers. Le serveur ne
  // le sait pas : useSyncExternalStore donne « false » au rendu serveur, la vraie valeur ensuite.
  const canPaste = useSyncExternalStore(
    noSubscription,
    () => Boolean(navigator.clipboard?.readText),
    () => false,
  );

  function read(importId?: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await importRecipeFromUrl({ url, importId, model });
      // Lien déjà importé : on ouvre la recette existante plutôt qu'un doublon
      if (result.status === "exists") return router.push(`/recettes/${result.recipeId}?deja=1`);
      if (result.status === "done") {
        const photoFile = result.draft.photo ? photoToFile(result.draft.photo) : null;
        // Rien à vérifier : la recette est enregistrée et sa fiche s'ouvre (décision 060)
        setSaving(true);
        const recipeUrl = await saveImportDirectly({
          draft: result.draft,
          recipeId: props.recipeId,
          userId: props.userId,
          defaultServings: props.defaultServings,
          photoFile,
        });
        if (recipeUrl) return router.push(recipeUrl);
        setSaving(false);
        // Sinon : le brouillon, avec seulement les points à regarder
        setDraft({
          mode: "import",
          ...draftToForm(result.draft, props.defaultServings),
          importId: result.draft.importId,
          pageUrls: [],
          sourceUrl: result.draft.sourceUrl,
          photoFile,
        });
        return;
      }
      setError({
        message: result.message,
        importId: result.importId,
        retry: result.status === "failed" && result.retryable,
      });
    });
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // Accès refusé par le navigateur : on colle à la main, rien de grave
    }
  }

  if (draft) {
    return (
      <RecipeForm
        recipeId={props.recipeId}
        userId={props.userId}
        defaultServings={props.defaultServings}
        items={props.items}
        aisles={props.aisles}
        collections={props.collections}
        initial={null}
        draft={draft}
      />
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) read();
      }}
    >
      <p className="text-muted-foreground text-sm">
        Collez le lien d&apos;une page de recette (Marmiton, 750g, un blog…). La recette sera lue
        puis affichée en brouillon : rien n&apos;est enregistré sans votre validation.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="recipe-url">Lien de la recette</Label>
        <div className="flex gap-2">
          <Input
            id="recipe-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…"
            value={url}
            disabled={pending}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(undefined);
            }}
          />
          {canPaste && (
            <Button type="button" variant="outline" disabled={pending} onClick={paste}>
              <ClipboardPaste />
              <span className="sr-only sm:not-sr-only">Coller</span>
            </Button>
          )}
        </div>
      </div>

      <ModelPicker models={props.models} value={model} disabled={pending} onChange={setModel} />

      {error && (
        <Card role="alert" className="border-destructive">
          <CardContent className="grid gap-3">
            <p className="text-sm">{error.message}</p>
            <div className="flex flex-wrap gap-2">
              {error.retry && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => read(error.importId ?? undefined)}
                >
                  Réessayer
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/recettes/import">
                  <Camera />
                  Essayer par photo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" size="lg" disabled={pending || !url.trim()}>
        {pending ? <LoaderCircle className="animate-spin" /> : <Link2 />}
        {saving
          ? "Enregistrement de la recette…"
          : pending
            ? "Lecture de la page…"
            : "Lire la recette"}
      </Button>
      {pending && (
        <p className="text-muted-foreground text-center text-sm" aria-live="polite">
          Cela prend en général 5 à 20 secondes.
        </p>
      )}
    </form>
  );
}
