"use client";

import { Camera, ImagePlus, LoaderCircle, PenLine, ScanText, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { importRecipeFromPhoto } from "@/app/(app)/recettes/import/actions";
import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { ModelPicker } from "@/components/recipe-import/model-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFreshSession } from "@/hooks/use-fresh-session";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import { draftToForm, NO_HIGHLIGHTS } from "@/lib/import-draft";
import { compressAndUploadImportPages } from "@/lib/photo-upload";

/** Nombre maximal de pages pour une recette (SPEC décision 049). */
const MAX_PAGES = 3;

type Page = { id: string; file: File; previewUrl: string };

type Props = {
  recipeId: string;
  userId: string;
  defaultServings: number;
  items: CatalogueItem[];
  aisles: Aisle[];
  collections: { id: string; name: string }[];
  /** Aperçus seulement : modèles proposés pour comparer (vide en production). */
  models: { id: string; label: string }[];
};

type Draft = NonNullable<React.ComponentProps<typeof RecipeForm>["draft"]>;

/**
 * Import d'une recette par photo (US-REC-02), en trois temps :
 * 1. capture : je photographie 1 à 3 pages (aperçus numérotés) ;
 * 2. lecture : les pages sont compressées, envoyées, puis lues par Claude côté serveur ;
 * 3. brouillon : le formulaire habituel, pré-rempli, avec les champs à vérifier surlignés.
 */
/**
 * Point d'entrée : une session neuve (formulaire vierge, nouvel identifiant de recette)
 * à chaque retour sur l'écran (cf. useFreshSession).
 */
export function PhotoImport(props: Omit<Props, "recipeId">) {
  const { key, recipeId } = useFreshSession();
  return <PhotoImportFlow key={key} {...props} recipeId={recipeId} />;
}

function PhotoImportFlow(props: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [step, setStep] = useState<"uploading" | "reading" | null>(null);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<Draft>();
  const [model, setModel] = useState(props.models[0]?.id);
  // Pages déjà envoyées : en cas d'échec, « Réessayer » ne les renvoie pas
  const [sent, setSent] = useState<{ paths: string[]; importId: string | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Les aperçus sont des adresses temporaires du navigateur : on les libère en partant
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const added = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_PAGES - pages.length)
      .map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
    setPages((list) => [...list, ...added]);
    setSent(null); // les pages ont changé : il faudra les renvoyer
    setError(undefined);
  }

  function removePage(id: string) {
    const page = pages.find((p) => p.id === id);
    if (page) URL.revokeObjectURL(page.previewUrl);
    setPages((list) => list.filter((p) => p.id !== id));
    setSent(null);
    setError(undefined);
  }

  function read() {
    setError(undefined);
    startTransition(async () => {
      try {
        // 1. Envoi des pages (sauf si elles sont déjà parties lors d'un essai précédent)
        let paths = sent?.paths;
        if (!paths) {
          setStep("uploading");
          paths = await compressAndUploadImportPages(
            pages.map((p) => p.file),
            props.userId,
            props.recipeId,
          );
        }
        // 2. Lecture par Claude, côté serveur
        setStep("reading");
        const result = await importRecipeFromPhoto({
          photoPaths: paths,
          importId: sent?.importId ?? undefined,
          model,
        });
        if (result.status === "done") {
          setDraft({
            mode: "import",
            ...draftToForm(result.draft, props.defaultServings),
            importId: result.draft.importId,
            pageUrls: pages.map((p) => p.previewUrl),
          });
          return;
        }
        setSent({ paths, importId: result.importId });
        setError(result.message);
      } catch {
        setError("L'envoi des photos a échoué. Vérifiez votre connexion et réessayez.");
      } finally {
        setStep(null);
      }
    });
  }

  /** Après un échec : formulaire vide, avec les pages affichées à côté (US-REC-02). */
  function enterManually() {
    const empty = draftToForm(
      {
        importId: "",
        photoPaths: [],
        sourceUrl: null,
        photo: null,
        title: "",
        titleUncertain: false,
        servings: null,
        servingsUncertain: false,
        steps: [],
        bookPage: null,
        ingredients: [],
      },
      props.defaultServings,
    );
    setDraft({
      mode: "manual",
      state: empty.state,
      highlights: NO_HIGHLIGHTS, // rien n'a été lu : rien à vérifier
      importId: sent?.importId ?? null,
      pageUrls: pages.map((p) => p.previewUrl),
    });
  }

  // 3. Brouillon : le formulaire habituel, pré-rempli
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

  const busy = pending || step !== null;
  const full = pages.length >= MAX_PAGES;

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Photographiez la page de la recette, bien à plat et éclairée. Si elle continue sur une autre
        page, ajoutez-la (jusqu&apos;à {MAX_PAGES} pages).
      </p>

      {/* Champs de fichier cachés, ouverts par les boutons ci-dessous */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment" // sur mobile : ouvre directement l'appareil photo
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ""; // permet de reprendre la même photo
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {pages.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pages.map((page, index) => (
            <li key={page.id} className="relative overflow-hidden rounded-lg border">
              {/* Aperçu local (adresse blob:), pas besoin de l'optimiseur d'images */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.previewUrl}
                alt={`Page ${index + 1}`}
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="bg-background/90 absolute bottom-2 left-2 rounded-md px-2 py-1 text-sm font-medium">
                Page {index + 1}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                disabled={busy}
                onClick={() => removePage(page.id)}
                aria-label={`Retirer la page ${index + 1}`}
              >
                <X />
              </Button>
            </li>
          ))}
        </ol>
      )}

      {!full && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant={pages.length ? "outline" : "default"}
            disabled={busy}
            onClick={() => cameraInput.current?.click()}
          >
            <Camera />
            {pages.length ? "Photographier la page suivante" : "Prendre une photo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus />
            {pages.length ? "Ajouter une image" : "Choisir une image"}
          </Button>
        </div>
      )}

      {error && (
        <Card role="alert" className="border-destructive">
          <CardContent className="grid gap-3">
            <p className="text-sm">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="justify-self-start"
              onClick={enterManually}
            >
              <PenLine />
              Saisir à la main, avec la photo à côté
            </Button>
          </CardContent>
        </Card>
      )}

      {pages.length > 0 && (
        <ModelPicker models={props.models} value={model} disabled={busy} onChange={setModel} />
      )}

      {pages.length > 0 && (
        <div className="bg-background/95 sticky bottom-20 z-10 grid gap-2 rounded-xl border p-3 shadow-sm backdrop-blur md:bottom-4">
          <Button type="button" size="lg" disabled={busy} onClick={read}>
            {busy ? <LoaderCircle className="animate-spin" /> : <ScanText />}
            {step === "uploading"
              ? "Envoi des photos…"
              : step === "reading"
                ? "Lecture de la recette…"
                : sent
                  ? "Réessayer"
                  : "Lire la recette"}
          </Button>
          {step === "reading" && (
            <p className="text-muted-foreground text-center text-sm" aria-live="polite">
              Cela prend en général 10 à 30 secondes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
