"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteRecipe, discardPhotos, saveRecipe } from "@/app/(app)/recettes/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { CollectionsPicker } from "@/components/recipe-form/collections-picker";
import { IngredientRow } from "@/components/recipe-form/ingredient-row";
import { NewItemDialog } from "@/components/recipe-form/new-item-dialog";
import { PhotoPicker } from "@/components/recipe-form/photo-picker";
import { StepsEditor } from "@/components/recipe-form/steps-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ServingsStepper } from "@/components/ui/servings-stepper";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import { compressAndUploadPhoto } from "@/lib/photo-upload";
import { quantityToInput } from "@/lib/quantity";
import {
  type FormErrors,
  type FormIngredient,
  formToRecipeInput,
  type RecipeFormState,
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
  const [state, setState] = useState(() => initialState(initial, props.defaultServings));
  const [items, setItems] = useState(props.items);
  const [collections, setCollections] = useState(props.collections);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [newItem, setNewItem] = useState<{ lineKey: string; name: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (patch: Partial<RecipeFormState>) => setState((s) => ({ ...s, ...patch }));
  const updateLine = (key: string, patch: Partial<FormIngredient>) =>
    setState((s) => ({
      ...s,
      ingredients: s.ingredients.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    }));
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
        const saved = await saveRecipe({ id: recipeId, recipe: result.data, photoPath, thumbPath });
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

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Card>
        <CardContent className="grid gap-4">
          <FormField
            label="Titre"
            name="title"
            value={state.title}
            onChange={(e) => update({ title: e.target.value })}
            error={errors.title}
            placeholder="ex. Gratin dauphinois"
            required
          />
          <div className="grid gap-2">
            <p className="text-sm font-medium">Nombre de personnes</p>
            <ServingsStepper
              name="servings"
              defaultValue={state.servings}
              max={50}
              label="Nombre de personnes de la recette"
              onValueChange={(servings) => update({ servings })}
            />
          </div>
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
                onCreateItem={(name) => setNewItem({ lineKey: line.key, name })}
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
        aisles={props.aisles}
        onOpenChange={(open) => !open && setNewItem(null)}
        onCreated={(item) => {
          setItems((list) =>
            list.some((i) => i.id === item.id)
              ? list
              : [...list, item].sort((a, b) => a.name.localeCompare(b.name, "fr")),
          );
          if (newItem) {
            updateLine(newItem.lineKey, {
              itemId: item.id,
              itemName: item.name,
              unit: item.defaultUnit,
            });
          }
        }}
      />
    </form>
  );
}
