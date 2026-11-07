"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChefHat, ListChecks, ListPlus, ShoppingBasket, Trash2, Users } from "lucide-react";

import {
  addMenuRecipeToList,
  createListFromMenu,
  removeRecipeFromMenu,
  setMenuRecipeServings,
} from "@/app/(app)/menus/actions";
import { CardActionsMenu } from "@/components/cards/card-actions-menu";
import { SwipeableRow } from "@/components/cards/swipeable-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServingsStepper } from "@/components/ui/servings-stepper";
import { listHref } from "@/lib/list-href";
import type { MenuList } from "@/lib/menus";

/** Une recette du menu, prête à afficher. */
export type MenuViewRecipe = {
  recipeId: string;
  title: string;
  thumbUrl: string | null;
  servings: number; // personnes prévues dans ce menu
};

/**
 * Fiche d'un menu (US-MEN-05, décision 069) : seulement les recettes du menu.
 * Pour chacune : changer les portions ou la retirer (menu ⋯ / glissement), et, si la
 * liste existe déjà sans elle, « Ajouter à la liste » (US-MEN-03).
 * En bas : créer la liste, ou l'ouvrir.
 */
export function MenuView({
  menuId,
  recipes,
  list,
}: {
  menuId: string;
  recipes: MenuViewRecipe[];
  list: MenuList | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);
  // Fenêtres ouvertes : portions ou retrait d'une recette
  const [servingsOf, setServingsOf] = useState<MenuViewRecipe | null>(null);
  const [newServings, setNewServings] = useState(0);
  const [removing, setRemoving] = useState<MenuViewRecipe | null>(null);

  // Liste tirée de ce menu et pas terminée : on propose de l'ouvrir
  const openList = list && list.status !== "done" ? list : null;
  const inList = new Set(list?.recipeIds ?? []);

  /** Lance une action serveur ; en cas de succès, relit la page (données à jour). */
  function run(action: () => Promise<{ ok: boolean }>, error: string, after?: () => void) {
    setFailed(null);
    startTransition(async () => {
      const { ok } = await action();
      if (!ok) return setFailed(error);
      after?.();
      router.refresh();
    });
  }

  function createList() {
    setFailed(null);
    startTransition(async () => {
      const result = await createListFromMenu(menuId); // ouvre la revue en cas de succès
      if (!result.ok) setFailed("La liste n'a pas pu être créée. Réessayez.");
    });
  }

  return (
    <div className="grid gap-4">
      {recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
          <ChefHat className="text-primary size-10" aria-hidden="true" />
          <p className="font-medium">Aucune recette dans ce menu</p>
          <Button asChild>
            <Link href={`/menus/${menuId}/modifier`}>Choisir des recettes</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3" aria-label="Recettes du menu">
          {recipes.map((r) => {
            const missing = openList !== null && !inList.has(r.recipeId);
            const askServings = () => {
              setNewServings(r.servings);
              setServingsOf(r);
            };
            return (
              <li key={r.recipeId} className="grid gap-2">
                <SwipeableRow
                  primary={{ label: "Portions", Icon: Users, onClick: askServings }}
                  onDelete={() => setRemoving(r)}
                >
                  <div className="group bg-card hover:bg-accent flex items-center gap-1 rounded-xl border pr-2 shadow-sm transition-colors">
                    <Link
                      href={`/recettes/${r.recipeId}`}
                      className="flex min-w-0 flex-1 items-center gap-3 p-3"
                    >
                      <span className="bg-secondary flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                        {r.thumbUrl ? (
                          // Photo privée servie par un lien temporaire : balise img simple
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.thumbUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <ChefHat
                            className="text-secondary-foreground/60 size-7"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className="grid min-w-0 gap-1">
                        <span className="truncate font-medium">{r.title}</span>
                        <span className="text-muted-foreground flex items-center gap-1 text-sm">
                          <Users className="size-4" aria-hidden="true" />
                          {r.servings} pers.
                        </span>
                        {missing && (
                          <span className="text-primary text-xs font-medium">
                            Pas encore dans la liste
                          </span>
                        )}
                      </span>
                    </Link>
                    <CardActionsMenu
                      label={`Actions pour « ${r.title} »`}
                      actions={[
                        { label: "Portions", Icon: Users, onClick: askServings },
                        {
                          label: "Retirer du menu",
                          Icon: Trash2,
                          onClick: () => setRemoving(r),
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </SwipeableRow>
                {missing && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    aria-label={`Ajouter « ${r.title} » à la liste`}
                    onClick={() =>
                      run(
                        () => addMenuRecipeToList(menuId, r.recipeId),
                        "La recette n'a pas pu être ajoutée à la liste. Réessayez.",
                      )
                    }
                  >
                    <ListPlus />
                    Ajouter à la liste
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Barre du bas : reste visible au-dessus de la navigation mobile */}
      <div className="bg-background/95 sticky bottom-20 grid gap-1 py-2 backdrop-blur md:bottom-4">
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            {failed}
          </p>
        )}
        {openList ? (
          <Button asChild className="w-full">
            <Link href={listHref(openList)}>
              <ShoppingBasket />
              Voir la liste
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={recipes.length === 0 || pending}
            onClick={createList}
          >
            <ListChecks />
            {pending
              ? "Création de la liste…"
              : list
                ? "Créer une nouvelle liste"
                : "Créer la liste"}
          </Button>
        )}
      </div>

      {/* Portions d'une recette du menu */}
      <Dialog open={servingsOf !== null} onOpenChange={(open) => !open && setServingsOf(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portions</DialogTitle>
            <DialogDescription>
              Nombre de personnes pour « {servingsOf?.title} » dans ce menu.
            </DialogDescription>
          </DialogHeader>
          {servingsOf && (
            <ServingsStepper
              defaultValue={servingsOf.servings}
              max={50}
              label={`Personnes pour ${servingsOf.title}`}
              onValueChange={setNewServings}
            />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                servingsOf &&
                run(
                  () => setMenuRecipeServings(menuId, servingsOf.recipeId, newServings),
                  "Les portions n'ont pas pu être enregistrées. Réessayez.",
                  () => setServingsOf(null),
                )
              }
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retirer une recette du menu */}
      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer cette recette du menu ?</DialogTitle>
            <DialogDescription>
              « {removing?.title} » est retirée du menu. La recette elle-même est gardée
              {openList ? ", et la liste n'est pas modifiée" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                removing &&
                run(
                  () => removeRecipeFromMenu(menuId, removing.recipeId),
                  "La recette n'a pas pu être retirée. Réessayez.",
                  () => setRemoving(null),
                )
              }
            >
              Retirer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
