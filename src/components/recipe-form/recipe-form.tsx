"use client";

import { Camera, Link2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteRecipe, discardPhotos, saveRecipe } from "@/app/(app)/recettes/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { CollectionsPicker } from "@/components/recipe-form/collections-picker";
import { IngredientRow } from "@/components/recipe-form/ingredient-row";
import { NewItemDialog } from "@/components/recipe-form/new-item-dialog";
import { PhotoPicker } from "@/components/recipe-form/photo-picker";
import { ReviewHighlight } from "@/components/recipe-form/review-highlight";
import { ImportPagesPanel } from "@/components/recipe-import/import-pages-panel";
import { StepsEditor } from "@/components/recipe-form/steps-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ServingsStepper } from "@/components/ui/servings-stepper";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import {
  countHighlights,
  countProposed,
  type DraftHighlights,
  learnedAliases,
  type NewItemSuggestion,
  NO_HIGHLIGHTS,
} from "@/lib/import-draft";
import { compressAndUploadPhoto } from "@/lib/photo-upload";
import { quantityToInput } from "@/lib/quantity";
import {
  type FormErrors,
  type FormIngredient,
  formToRecipeInput,
  type RecipeFormState,
  unitForChosenItem,
} from "@/lib/recipe-form";
import type { RecipeForEdit } from "@/lib/recipes";

type RecipeFormProps = {
  recipeId: string; // déjà connu, même pour une nouvelle recette (dossier des photos)
  userId: string;
  defaultServings: number;
  items: CatalogueItem[];
  aisles: Aisle[];
  collections: { id: string; name: string }[];
  initial: RecipeForEdit | null; // null = création
  /** Brouillon importé par photo : formulaire pré-rempli et champs à vérifier. */
  draft?: {
    mode: "import" | "manual"; // lue par l'IA, ou saisie à la main après un échec
    state: RecipeFormState;
    highlights: DraftHighlights;
    importId: string | null; // sa source (pages ou lien) sera attachée à la recette
    pageUrls: string[]; // aperçus des pages, affichés à côté du formulaire
    sourceUrl?: string | null; // import par lien : page d'origine
    photoFile?: File | null; // import par lien : photo du plat proposée par le site
  };
};

/**
 * Nouvelle ligne vide. La clé doit être identique côté serveur et côté navigateur
 * pour les lignes affichées au chargement (sinon React signale une incohérence) :
 * on passe donc une clé fixe au départ, et une clé aléatoire seulement après un clic.
 */
const newLine = (key: string = crypto.randomUUID()): FormIngredient => ({
  key,
  itemId: null,
  itemName: "",
  quantityText: "",
  unit: "",
  note: "",
});

function initialState(initial: RecipeForEdit | null, defaultServings: number): RecipeFormState {
  if (!initial) {
    return {
      title: "",
      servings: defaultServings,
      ingredients: [newLine("line-0")],
      steps: [""],
      bookTitle: "",
      bookPageText: "",
      sourceUrl: "",
      collectionIds: [],
    };
  }
  return {
    title: initial.title,
    servings: initial.servings,
    ingredients: initial.ingredients.map((i, index) => ({
      key: `line-${index}`,
      itemId: i.itemId,
      itemName: i.itemName,
      quantityText: quantityToInput(i.quantity),
      unit: i.unit ?? "",
      note: i.note ?? "",
    })),
    steps: initial.steps.length ? initial.steps : [""],
    bookTitle: initial.bookTitle ?? "",
    bookPageText: initial.bookPage ? String(initial.bookPage) : "",
    sourceUrl: initial.sourceUrl ?? "",
    collectionIds: initial.collectionIds,
  };
}

/**
 * Formulaire de création / modification d'une recette (US-REC-01).
 * Tout l'état du formulaire est gardé ici (useState) et envoyé en une fois.
 */
export function RecipeForm(props: RecipeFormProps) {
  const { recipeId, userId, initial } = props;
  const router = useRouter();
  const [state, setState] = useState(
    () => props.draft?.state ?? initialState(initial, props.defaultServings),
  );
  // Champs encore « À vérifier » : chacun disparaît dès qu'on le modifie
  const [highlights, setHighlights] = useState(props.draft?.highlights ?? NO_HIGHLIGHTS);
  const reviewed = (field: "title" | "servings") =>
    setHighlights((h) => (h[field] ? { ...h, [field]: false } : h));
  const reviewedLine = (key: string) =>
    setHighlights((h) => {
      if (!h.ingredients[key]) return h;
      const rest = Object.fromEntries(Object.entries(h.ingredients).filter(([k]) => k !== key));
      return { ...h, ingredients: rest };
    });
  const toReview = countHighlights(highlights);
  const proposedCount = countProposed(highlights);
  const [items, setItems] = useState(props.items);
  const [collections, setCollections] = useState(props.collections);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string>();
  const [photoFile, setPhotoFile] = useState<File | null>(props.draft?.photoFile ?? null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [newItem, setNewItem] = useState<{
    lineKey: string;
    name: string;
    suggestion?: NewItemSuggestion | null; // rayon et unités proposés par l'IA
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (patch: Partial<RecipeFormState>) => setState((s) => ({ ...s, ...patch }));
  const updateLine = (key: string, patch: Partial<FormIngredient>) => {
    reviewedLine(key);
    setState((s) => ({
      ...s,
      ingredients: s.ingredients.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    }));
  };
  const moveLine = (index: number, direction: -1 | 1) =>
    setState((s) => {
      const next = [...s.ingredients];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return { ...s, ingredients: next };
    });

  function submit() {
    setMessage(undefined);
    const result = formToRecipeInput(state);
    if (!result.ok) {
      setErrors(result.errors);
      setMessage("Certains champs sont à corriger.");
      return;
    }
    setErrors({});

    startTransition(async () => {
      try {
        // 1. Photo : compressée et envoyée depuis le navigateur si elle a changé
        let photoPath = photoRemoved ? null : (initial?.photoPath ?? null);
        let thumbPath = photoRemoved ? null : (initial?.thumbPath ?? null);
        let uploaded: string[] = [];
        if (photoFile) {
          ({ photoPath, thumbPath } = await compressAndUploadPhoto(photoFile, userId, recipeId));
          uploaded = [photoPath, thumbPath];
        }
        // 2. Recette, ingrédients et collections, en un seul bloc
        const saved = await saveRecipe({
          id: recipeId,
          recipe: result.data,
          photoPath,
          thumbPath,
          importId: props.draft?.importId ?? undefined,
          // Import lu par l'IA : mes corrections d'articles, retenues pour la prochaine fois
          learnedAliases:
            props.draft?.mode === "import"
              ? learnedAliases(props.draft.state.ingredients, state.ingredients)
              : [],
        });
        if (!saved.ok) {
          // Échec : la photo qu'on vient d'envoyer ne servira pas, on la supprime
          if (uploaded.length) await discardPhotos(uploaded);
          return setMessage(saved.message);
        }
        router.push(`/recettes/${saved.id}`);
      } catch {
        setMessage("L'envoi de la photo a échoué. Vérifiez votre connexion et réessayez.");
      }
    });
  }

  const pageUrls = props.draft?.pageUrls ?? [];
  const form = (
    <form
      className="grid min-w-0 gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {props.draft && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {props.draft.sourceUrl ? (
            <Link2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          ) : (
            <Camera className="mt-0.5 size-5 shrink-0" aria-hidden />
          )}
          {props.draft.mode === "manual" ? (
            <p>
              Saisie à la main : la photo est affichée{" "}
              <span className="lg:hidden">ci-dessous (à déplier)</span>
              <span className="hidden lg:inline">à droite</span>.
            </p>
          ) : (
            <p>
              {props.draft.sourceUrl
                ? `Recette lue sur ${new URL(props.draft.sourceUrl).hostname.replace(/^www\./, "")}`
                : "Recette lue sur la photo"}{" "}
              : rien n&apos;est encore enregistré.{" "}
              {toReview > 0
                ? `Vérifiez les champs surlignés (${toReview}), puis enregistrez.`
                : "Relisez-la, puis enregistrez."}
              {proposedCount > 0 &&
                ` ${proposedCount} article${proposedCount > 1 ? "s ont été proposés" : " a été proposé"} : un coup d'œil suffit.`}
            </p>
          )}
        </div>
      )}

      <Card>
        <CardContent className="grid gap-4">
          <ReviewHighlight
            active={highlights.title}
            hint={state.title ? "Titre difficile à lire." : "Titre introuvable sur la photo."}
          >
            <FormField
              label="Titre"
              name="title"
              value={state.title}
              onChange={(e) => {
                reviewed("title");
                update({ title: e.target.value });
              }}
              error={errors.title}
              placeholder="ex. Gratin dauphinois"
              required
            />
          </ReviewHighlight>
          <ReviewHighlight
            active={highlights.servings}
            hint="Nombre de personnes incertain ou absent de la photo."
          >
            <div className="grid gap-2">
              <p className="text-sm font-medium">Nombre de personnes</p>
              <ServingsStepper
                name="servings"
                defaultValue={state.servings}
                max={50}
                label="Nombre de personnes de la recette"
                onValueChange={(servings) => {
                  reviewed("servings");
                  update({ servings });
                }}
              />
            </div>
          </ReviewHighlight>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingrédients</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-muted-foreground text-sm">
            Laissez la quantité vide pour « au goût » (sel, poivre…).
          </p>
          <ul className="grid gap-3">
            {state.ingredients.map((line, index) => (
              <IngredientRow
                key={line.key}
                line={line}
                index={index}
                count={state.ingredients.length}
                items={items}
                error={errors[`ingredient-${line.key}`]}
                onChange={(patch) => updateLine(line.key, patch)}
                onMove={(direction) => moveLine(index, direction)}
                onRemove={() =>
                  update({ ingredients: state.ingredients.filter((l) => l.key !== line.key) })
                }
                onCreateItem={(name, suggestion) =>
                  setNewItem({ lineKey: line.key, name, suggestion })
                }
                highlight={highlights.ingredients[line.key]}
              />
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => update({ ingredients: [...state.ingredients, newLine()] })}
          >
            <Plus />
            Ajouter un ingrédient
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Étapes</CardTitle>
        </CardHeader>
        <CardContent>
          <StepsEditor steps={state.steps} onChange={(steps) => update({ steps })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoPicker
            currentUrl={initial?.photoUrl ?? null}
            file={photoFile}
            removed={photoRemoved}
            onFileChange={(file) => {
              setPhotoFile(file);
              setPhotoRemoved(false);
            }}
            onRemove={() => {
              setPhotoFile(null);
              setPhotoRemoved(true);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Livre et collections</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <FormField
              label="Livre"
              name="bookTitle"
              value={state.bookTitle}
              onChange={(e) => update({ bookTitle: e.target.value })}
              placeholder="Titre du livre"
            />
            <FormField
              label="Page"
              name="bookPage"
              inputMode="numeric"
              value={state.bookPageText}
              onChange={(e) => update({ bookPageText: e.target.value })}
              error={errors.bookPage}
            />
          </div>
          <FormField
            label="Lien de la page"
            name="sourceUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            value={state.sourceUrl}
            onChange={(e) => update({ sourceUrl: e.target.value })}
            error={errors.sourceUrl}
            placeholder="https://… (site ou blog de la recette)"
          />
          <div className="grid gap-2">
            <Label>Collections</Label>
            <CollectionsPicker
              collections={collections}
              selectedIds={state.collectionIds}
              onChange={(collectionIds) => update({ collectionIds })}
              onCollectionCreated={(c) =>
                setCollections((list) =>
                  list.some((x) => x.id === c.id)
                    ? list
                    : [...list, c].sort((a, b) => a.name.localeCompare(b.name, "fr")),
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      <FormMessage message={message} />
      <div className="bg-background/95 sticky bottom-20 z-10 flex gap-3 rounded-xl border p-3 shadow-sm backdrop-blur md:bottom-4">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Annuler
        </Button>
      </div>

      {initial && (
        <Card>
          <CardContent className="grid gap-3">
            {confirmDelete ? (
              <>
                <p className="text-sm">
                  Supprimer définitivement « {initial.title} » ? Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => startTransition(() => deleteRecipe(initial.id))}
                  >
                    Oui, supprimer
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </Button>
                </div>
              </>
            ) : (
              <Button
                type="button"
                variant="destructive"
                className="justify-self-start"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 />
                Supprimer la recette…
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <NewItemDialog
        key={newItem ? `${newItem.lineKey}-${newItem.name}` : "closed"}
        open={newItem !== null}
        initialName={newItem?.name ?? ""}
        suggestion={newItem?.suggestion ?? null}
        aisles={props.aisles}
        onOpenChange={(open) => !open && setNewItem(null)}
        onCreated={(item) => {
          setItems((list) =>
            list.some((i) => i.id === item.id)
              ? list
              : [...list, item].sort((a, b) => a.name.localeCompare(b.name, "fr")),
          );
          if (newItem) {
            const line = state.ingredients.find((l) => l.key === newItem.lineKey);
            updateLine(newItem.lineKey, {
              itemId: item.id,
              itemName: item.name,
              // L'unité déjà présente (celle de la recette) n'est pas écrasée
              unit: unitForChosenItem(line?.unit ?? "", item.defaultUnit),
            });
          }
        }}
      />
    </form>
  );

  // Recette issue d'un import : les pages photographiées à côté du formulaire
  if (pageUrls.length === 0) return form;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="lg:sticky lg:top-4 lg:order-2">
        <ImportPagesPanel pageUrls={pageUrls} />
      </div>
      <div className="min-w-0 lg:order-1">{form}</div>
    </div>
  );
}
