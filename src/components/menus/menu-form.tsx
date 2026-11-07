"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  ChefHat,
  ListChecks,
  Plus,
  Save,
  Search,
  Share2,
  X,
} from "lucide-react";

import { createListFromMenu, saveMenu } from "@/app/(app)/menus/actions";
import { AddRecipeMenu } from "@/components/recipes/add-recipe-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServingsStepper } from "@/components/ui/servings-stepper";
import type { DraftRecipe } from "@/lib/lists";
import type { RecipeSummary } from "@/lib/recipes";
import { normalizeText } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * Formulaire d'un menu (US-MEN-01, décision 069) : nom, recettes et portions.
 * Comme le formulaire d'une recette, rien n'est enregistré avant de valider :
 * « Enregistrer le menu » ouvre sa fiche, « Enregistrer et créer la liste » la revue.
 */
export function MenuForm({
  menuId,
  initialName,
  initialSelected,
  recipes,
  collections,
  defaultServings,
  hasOpenList,
  addedTitle = null,
}: {
  menuId: string | null; // null : nouveau menu, pas encore enregistré
  initialName: string;
  initialSelected: DraftRecipe[];
  recipes: RecipeSummary[];
  collections: { id: string; name: string }[]; // mes collections (catégories)
  defaultServings: number;
  /** Le menu a déjà une liste pas terminée : le 2e bouton l'ouvre au lieu d'en créer une. */
  hasOpenList: boolean;
  /** Recette tout juste créée depuis ce formulaire, déjà ajoutée (décision 064). */
  addedTitle?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState(initialSelected);
  const [query, setQuery] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  // Recettes par identifiant, pour afficher le titre des recettes choisies
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const selectedIds = new Set(selected.map((s) => s.recipeId));
  // Recettes affichées : filtrées par collection (catégorie) puis par la recherche
  const visible = useMemo(() => {
    const q = normalizeText(query);
    return recipes.filter(
      (r) =>
        (!collectionId || r.collections.some((c) => c.id === collectionId)) &&
        (!q || normalizeText(r.title).includes(q)),
    );
  }, [recipes, query, collectionId]);

  function toggle(recipeId: string) {
    setSelected(
      selectedIds.has(recipeId)
        ? selected.filter((s) => s.recipeId !== recipeId)
        : [...selected, { recipeId, servings: defaultServings }],
    );
  }

  function setServings(recipeId: string, servings: number) {
    setSelected(selected.map((s) => (s.recipeId === recipeId ? { ...s, servings } : s)));
  }

  /** Enregistre le menu ; renvoie son identifiant (ou null si l'enregistrement échoue). */
  async function save(): Promise<string | null> {
    const result = await saveMenu(menuId, { name: name.trim() || initialName, recipes: selected });
    setFailed(!result.ok);
    return result.ok ? result.menuId : null;
  }

  /** « Enregistrer le menu » : puis sa fiche. */
  function saveAndView() {
    startTransition(async () => {
      const id = await save();
      if (id) router.push(`/menus/${id}`);
    });
  }

  /** « Enregistrer et créer la liste » : l'action ouvre la revue (ou la liste existante). */
  function saveAndList() {
    startTransition(async () => {
      const id = await save();
      if (!id) return;
      const result = await createListFromMenu(id); // ne revient pas en cas de succès
      if (!result.ok) setFailed(true);
    });
  }

  /**
   * « Créer une recette » (décision 064) : le menu est d'abord enregistré (créé s'il est
   * nouveau), pour pouvoir y revenir avec la recette ajoutée.
   */
  function beforeCreate(): Promise<string | null> {
    return save();
  }

  return (
    <div className="grid gap-6">
      {addedTitle && (
        <p role="status" className="bg-muted flex items-start gap-2 rounded-lg p-3 text-sm">
          <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Recette « {addedTitle} » créée et ajoutée au menu.
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="menu-name">Nom du menu</Label>
        <Input
          id="menu-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {selected.length > 0 && (
        <section className="grid gap-2" aria-labelledby="selected-title">
          <h2 id="selected-title" className="font-medium">
            Au menu ({selected.length})
          </h2>
          <ul className="divide-border bg-card divide-y rounded-xl border">
            {selected.map((s) => {
              const recipe = byId.get(s.recipeId);
              return (
                <li key={s.recipeId} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate font-medium">
                      {recipe?.title ?? "Recette indisponible"}
                    </p>
                    {recipe && recipe.servings !== s.servings && (
                      <p className="text-muted-foreground text-xs">
                        Recette prévue pour {recipe.servings} pers.
                      </p>
                    )}
                  </div>
                  <ServingsStepper
                    defaultValue={s.servings}
                    max={50}
                    label={`Personnes pour ${recipe?.title ?? "cette recette"}`}
                    onValueChange={(value) => setServings(s.recipeId, value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggle(s.recipeId)}
                    aria-label={`Retirer ${recipe?.title ?? "cette recette"}`}
                  >
                    <X />
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="grid gap-3" aria-labelledby="add-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="add-title" className="font-medium">
            {selected.length
              ? "Ajouter d'autres recettes"
              : "Choisissez les recettes de la semaine"}
          </h2>
          {/* Recette absente : on la crée, puis on revient ici, recette ajoutée */}
          <AddRecipeMenu label="Créer une recette" variant="outline" beforeLeave={beforeCreate} />
        </div>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une recette"
            aria-label="Rechercher une recette"
            className="pl-9"
          />
        </div>
        {collections.length > 0 && (
          <div
            role="group"
            aria-label="Filtrer par collection"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            {[{ id: null, name: "Toutes" }, ...collections].map((c) => (
              <button
                key={c.id ?? "toutes"}
                type="button"
                onClick={() => setCollectionId(c.id)}
                aria-pressed={collectionId === c.id}
                className={cn(
                  "flex h-11 shrink-0 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                  collectionId === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        {visible.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {recipes.length === 0
              ? "Ajoutez d'abord des recettes dans Mes recettes."
              : "Aucune recette ne correspond."}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {visible.map((recipe) => {
              const isSelected = selectedIds.has(recipe.id);
              return (
                <li key={recipe.id}>
                  <button
                    type="button"
                    onClick={() => toggle(recipe.id)}
                    aria-pressed={isSelected}
                    className="bg-card hover:bg-accent aria-pressed:border-primary aria-pressed:bg-secondary flex min-h-11 w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors"
                  >
                    <span className="bg-secondary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                      {recipe.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={recipe.thumbUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <ChefHat
                          className="text-secondary-foreground/60 size-6"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">{recipe.title}</span>
                      {recipe.sharedBy && (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Share2 className="size-3" aria-hidden="true" />
                          Partagé par {recipe.sharedBy}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        isSelected
                          ? "bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full"
                          : "text-primary flex size-8 shrink-0 items-center justify-center rounded-full border"
                      }
                      aria-hidden="true"
                    >
                      {isSelected ? <Check className="size-4" /> : <Plus className="size-4" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Barre du bas : reste visible au-dessus de la navigation mobile */}
      <div className="bg-background/95 sticky bottom-20 grid gap-2 py-2 backdrop-blur md:bottom-4">
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            L&apos;enregistrement a échoué. Vérifiez votre connexion.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" disabled={pending} onClick={saveAndView}>
            <Save />
            Enregistrer le menu
          </Button>
          <Button type="button" disabled={pending || selected.length === 0} onClick={saveAndList}>
            <ListChecks />
            {hasOpenList ? "Enregistrer et voir la liste" : "Enregistrer et créer la liste"}
          </Button>
        </div>
      </div>
    </div>
  );
}
