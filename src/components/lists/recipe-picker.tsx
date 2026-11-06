"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, CheckCircle2, ChefHat, ListChecks, Plus, Search, Share2, X } from "lucide-react";

import { saveListRecipes } from "@/app/(app)/listes/actions";
import { AddRecipeMenu } from "@/components/recipes/add-recipe-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServingsStepper } from "@/components/ui/servings-stepper";
import type { DraftRecipe } from "@/lib/lists";
import type { RecipeSummary } from "@/lib/recipes";
import { normalizeText } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * Étape 1 de « Nouvelle liste » : choisir des recettes et leurs portions.
 * Chaque changement est enregistré automatiquement (brouillon), après une courte
 * pause : on n'envoie pas une requête à chaque clic sur « + ».
 */
export function RecipePicker({
  recipes,
  collections,
  initialListId,
  initialSelected,
  defaultServings,
  addedTitle = null,
}: {
  recipes: RecipeSummary[];
  collections: { id: string; name: string }[]; // mes collections (catégories)
  initialListId: string | null;
  initialSelected: DraftRecipe[];
  defaultServings: number;
  /** Recette tout juste créée depuis cette étape, déjà cochée (décision 064). */
  addedTitle?: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialSelected);
  const [listId, setListId] = useState(initialListId);
  const [query, setQuery] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
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

  // --- Enregistrement automatique -------------------------------------------
  // useRef garde une valeur entre deux affichages sans provoquer de nouvel affichage :
  // ici, le minuteur en attente et la dernière sélection à enregistrer.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(selected);
  const listIdRef = useRef(listId);
  const dirty = useRef(false);
  // File d'attente des enregistrements : chacun attend la fin du précédent.
  // Sans elle, deux enregistrements simultanés pourraient créer deux listes.
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));

  /** Ajoute un enregistrement à la file ; il lira la sélection au moment de partir. */
  function save() {
    queue.current = queue.current.then(saveNow);
    return queue.current;
  }

  async function saveNow() {
    dirty.current = false;
    const result = await saveListRecipes(listIdRef.current, latest.current);
    if (result.ok) {
      if (!listIdRef.current) {
        // Liste tout juste créée : l'adresse devient la sienne, sans recharger la page
        // (un rafraîchissement reprendra cette liste au lieu d'en créer une autre)
        window.history.replaceState(null, "", `/listes/${result.listId}/recettes`);
      }
      listIdRef.current = result.listId;
      setListId(result.listId);
      setSaveFailed(false);
    } else {
      setSaveFailed(true);
    }
    return result.ok;
  }

  function update(next: DraftRecipe[]) {
    setSelected(next);
    latest.current = next;
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    // Enregistrement en arrière-plan, HORS transition : le bouton « Revoir les ingrédients »
    // reste cliquable pendant ce temps (il attendra la fin de la file si besoin)
    timer.current = setTimeout(() => void save(), 600);
  }

  // Si on quitte la page avec une modification en attente, on l'enregistre quand même
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      // (dans la file, pour attendre un éventuel premier enregistrement qui crée la liste)
      if (dirty.current) {
        void queue.current.then(() => saveListRecipes(listIdRef.current, latest.current));
      }
    };
  }, []);

  function toggle(recipeId: string) {
    update(
      selectedIds.has(recipeId)
        ? selected.filter((s) => s.recipeId !== recipeId)
        : [...selected, { recipeId, servings: defaultServings }],
    );
  }

  function setServings(recipeId: string, servings: number) {
    update(selected.map((s) => (s.recipeId === recipeId ? { ...s, servings } : s)));
  }

  /**
   * « Créer une recette » (décision 064) : avant de partir, la sélection en cours est
   * enregistrée (la liste est créée si besoin) ; on renvoie la liste à laquelle revenir.
   */
  async function beforeCreate(): Promise<string> {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current || (!listIdRef.current && latest.current.length)) await save();
    else await queue.current;
    return listIdRef.current ?? "nouvelle";
  }

  function goToReview() {
    if (timer.current) clearTimeout(timer.current);
    startTransition(async () => {
      // Modification pas encore partie : on l'enregistre ; sinon on attend la file en cours
      const ok = dirty.current || !listIdRef.current ? await save() : await queue.current;
      if (ok) router.push(`/listes/${listIdRef.current}/revue`);
    });
  }

  return (
    <div className="grid gap-6">
      {addedTitle && (
        <p role="status" className="bg-muted flex items-start gap-2 rounded-lg p-3 text-sm">
          <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Recette « {addedTitle} » créée et ajoutée à la liste.
        </p>
      )}

      {selected.length > 0 && (
        <section className="grid gap-2" aria-labelledby="selected-title">
          <h2 id="selected-title" className="font-medium">
            Recettes choisies ({selected.length})
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
            {selected.length ? "Ajouter d'autres recettes" : "Choisissez vos recettes"}
          </h2>
          {/* Recette absente : on la crée, puis on revient ici, recette cochée */}
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
      <div className="bg-background/95 sticky bottom-20 grid gap-1 py-2 backdrop-blur md:bottom-4">
        {saveFailed && (
          <p role="alert" className="text-destructive text-sm">
            L&apos;enregistrement a échoué. Vérifiez votre connexion.
          </p>
        )}
        <Button
          type="button"
          className="w-full"
          disabled={selected.length === 0 || pending}
          onClick={goToReview}
        >
          <ListChecks />
          {selected.length === 0
            ? "Choisissez au moins une recette"
            : `Revoir les ingrédients (${selected.length} recette${selected.length > 1 ? "s" : ""})`}
        </Button>
      </div>
    </div>
  );
}
