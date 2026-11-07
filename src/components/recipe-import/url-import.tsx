"use client";

import { Camera, ClipboardPaste, Link2, LoaderCircle, ScanText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { importRecipeFromText, importRecipeFromUrl } from "@/app/(app)/recettes/import/actions";
import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { ModelPicker } from "@/components/recipe-import/model-picker";
import { saveImportDirectly } from "@/components/recipe-import/save-import";
import { urlAfterCreate } from "@/components/recipes/after-create";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFreshSession } from "@/hooks/use-fresh-session";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import { draftToForm, type ImportDraft } from "@/lib/import-draft";

type Props = {
  recipeId: string;
  returnToMenu: string | null; // venu d'un menu (US-MEN-01, décision 064)
  /** Partage vers Olva (décision 065) : lien ou texte reçu, lu dès l'ouverture. */
  shared: { url: string } | { text: string } | null;
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
type Result =
  | Awaited<ReturnType<typeof importRecipeFromUrl>>
  | Awaited<ReturnType<typeof importRecipeFromText>>;

/** Photo du site (base64 renvoyé par le serveur) → fichier, comme une photo choisie soi-même. */
function photoToFile(photo: NonNullable<ImportDraft["photo"]>): File {
  const bytes = Uint8Array.from(atob(photo.data), (c) => c.charCodeAt(0));
  const extension = photo.mediaType.split("/")[1];
  return new File([bytes], `photo-du-site.${extension}`, { type: photo.mediaType });
}

/**
 * Point d'entrée : une session neuve (formulaire vierge, nouvel identifiant de recette)
 * à chaque retour sur l'écran (cf. useFreshSession).
 */
export function UrlImport(props: Omit<Props, "recipeId">) {
  const { key, recipeId } = useFreshSession();
  return <UrlImportFlow key={key} {...props} recipeId={recipeId} />;
}

/**
 * Import d'une recette depuis un lien (US-REC-07) : je colle l'adresse d'une page, le
 * serveur la lit, Claude en tire la recette ; enregistrement direct si rien n'est à
 * vérifier, sinon le brouillon surligné.
 * Deux entrées de plus (décision 065) :
 * - « Coller le texte » : la légende d'une publication Instagram, une note… ;
 * - le partage vers Olva (menu « Partager », Raccourci iPhone) : le lien ou le texte
 *   reçu est lu dès l'ouverture, sans rien toucher.
 */
function UrlImportFlow(props: Props) {
  const sharedText = props.shared && "text" in props.shared ? props.shared.text : "";
  const [mode, setMode] = useState<"link" | "text">(sharedText ? "text" : "link");
  const [url, setUrl] = useState(props.shared && "url" in props.shared ? props.shared.url : "");
  const [text, setText] = useState(sharedText);
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

  /** Fin commune (lien ou texte) : recette existante, enregistrement direct, ou brouillon. */
  async function handle(result: Result) {
    // Lien déjà importé : on ouvre la recette existante plutôt qu'un doublon
    // (venu d'un menu : c'est elle qui est ajoutée au menu)
    if (result.status === "exists") {
      return router.push(await urlAfterCreate(result.recipeId, props.returnToMenu, "?deja=1"));
    }
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
        returnToMenu: props.returnToMenu,
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
  }

  function read(importId?: string) {
    setError(undefined);
    startTransition(async () => {
      await handle(
        mode === "text"
          ? await importRecipeFromText({ text, importId, model })
          : await importRecipeFromUrl({ url, importId, model }),
      );
    });
  }

  // Partage vers Olva : la lecture démarre seule, une seule fois, à l'ouverture.
  // useEffectEvent : la fonction lit toujours les valeurs à jour, sans relancer l'effet.
  const started = useRef(false);
  const readShared = useEffectEvent(() => read());
  useEffect(() => {
    if (props.shared && !started.current) {
      started.current = true;
      readShared();
    }
  }, [props.shared]);

  async function paste() {
    try {
      const pasted = await navigator.clipboard.readText();
      if (!pasted) return;
      if (mode === "text") setText(pasted);
      else setUrl(pasted.trim());
    } catch {
      // Accès refusé par le navigateur : on colle à la main, rien de grave
    }
  }

  function switchMode(next: "link" | "text") {
    setMode(next);
    setError(undefined);
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
        returnToMenu={props.returnToMenu}
      />
    );
  }

  const ready = mode === "text" ? text.trim().length >= 40 : Boolean(url.trim());

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) read();
      }}
    >
      {mode === "link" ? (
        <>
          <p className="text-muted-foreground text-sm">
            Collez le lien d&apos;une page de recette (Marmiton, 750g, un blog, Instagram…). Si rien
            n&apos;est à vérifier, la recette est enregistrée directement.
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
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            Collez le texte de la recette : la légende d&apos;une publication Instagram, une note,
            un message… Il doit contenir les ingrédients et les étapes.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="recipe-text">Texte de la recette</Label>
            <Textarea
              id="recipe-text"
              rows={8}
              value={text}
              disabled={pending}
              onChange={(e) => {
                setText(e.target.value);
                setError(undefined);
              }}
            />
            {canPaste && (
              <Button
                type="button"
                variant="outline"
                className="justify-self-start"
                disabled={pending}
                onClick={paste}
              >
                <ClipboardPaste />
                Coller
              </Button>
            )}
          </div>
        </>
      )}

      <Button
        type="button"
        variant="link"
        className="justify-self-start px-0"
        disabled={pending}
        onClick={() => switchMode(mode === "link" ? "text" : "link")}
      >
        {mode === "link" ? "Pas de lien ? Coller le texte" : "J'ai un lien"}
      </Button>

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
              {mode === "link" && (
                <Button type="button" variant="outline" onClick={() => switchMode("text")}>
                  <ScanText />
                  Coller le texte
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

      <Button type="submit" size="lg" disabled={pending || !ready}>
        {pending ? <LoaderCircle className="animate-spin" /> : <Link2 />}
        {saving
          ? "Enregistrement de la recette…"
          : pending
            ? mode === "text"
              ? "Lecture du texte…"
              : "Lecture de la page…"
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
