import { BookOpen, Link2, ListChecks, Repeat, UtensilsCrossed } from "lucide-react";

import { cancelShareLink, removeShare } from "@/app/(app)/partage/actions";
import { ShareActionButton } from "@/components/sharing/share-action-button";
import {
  ShareEverythingButton,
  ShareRecipesAutoButton,
} from "@/components/sharing/share-everything-button";
import { ShareAutoListsButton } from "@/components/sharing/share-list-button";
import type { MyShares, ShareRow } from "@/lib/sharing";

/** Date courte en français : « 8 nov. ». */
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

//   : espace insécable, pour que les guillemets ne se retrouvent jamais seuls en début de ligne
const quoted = (title: string) => `« ${title} »`;

/** Texte d'une ligne « Je partage ». */
function sentText(share: ShareRow) {
  switch (share.type) {
    case "library":
      return `Toutes mes recettes, avec ${share.personName}`;
    case "recipe":
      return `${quoted(share.recipeTitle)}, avec ${share.personName}`;
    case "list":
      return `${share.listName}, avec ${share.personName}`;
    case "auto_lists":
      return `Mes nouvelles listes, automatiquement avec ${share.personName}`;
  }
}

/** Texte d'une ligne « On me partage ». */
function receivedText(share: ShareRow) {
  switch (share.type) {
    case "library":
      return `Toutes les recettes de ${share.personName}`;
    case "recipe":
      return `${quoted(share.recipeTitle)}, de ${share.personName}`;
    case "list":
      return `${share.listName}, de ${share.personName}`;
    case "auto_lists":
      return `Les nouvelles listes de ${share.personName}`;
  }
}

/**
 * Paramètres → Mes partages : ce que je partage (et mes liens en attente),
 * puis ce qu'on me partage. Composant serveur : les boutons reçoivent des
 * actions serveur déjà préparées avec .bind (pas de code de chargement côté navigateur).
 */
export function MyShares({ shares }: { shares: MyShares }) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-2" aria-labelledby="sent-title">
        <h3 id="sent-title" className="font-medium">
          Je partage
        </h3>
        {shares.sent.length === 0 && shares.pendingLinks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Rien pour l&apos;instant. Partagez une recette depuis sa fiche, toutes vos recettes
            depuis Mes recettes, ou une liste prête depuis sa page.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {shares.sent.map((share) => (
              <ShareLine key={rowKey(share)} share={share} text={sentText(share)} label="Retirer" />
            ))}
            {shares.pendingLinks.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-3">
                <Link2 className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm">
                  Lien en attente : {link.label}
                  <span className="text-muted-foreground block">
                    Expire le {shortDate(link.expiresAt)}
                  </span>
                </p>
                <ShareActionButton
                  label="Annuler"
                  pendingLabel="Annulation…"
                  onConfirm={cancelShareLink.bind(null, link.id)}
                />
              </li>
            ))}
          </ul>
        )}
        {/* Partages automatiques : listes, recettes, ou tout à la fois (décision 076) */}
        <div className="flex flex-col items-start gap-2 pt-2">
          <ShareAutoListsButton />
          <ShareRecipesAutoButton />
          <ShareEverythingButton />
        </div>
      </section>

      <section className="grid gap-2 border-t pt-6" aria-labelledby="received-title">
        <h3 id="received-title" className="font-medium">
          On me partage
        </h3>
        {shares.received.length === 0 ? (
          <p className="text-muted-foreground text-sm">Personne ne vous partage rien.</p>
        ) : (
          <ul className="divide-border divide-y">
            {shares.received.map((share) => (
              <ShareLine
                key={rowKey(share)}
                share={share}
                text={receivedText(share)}
                label="Renoncer"
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function rowKey(share: ShareRow) {
  switch (share.type) {
    case "library":
    case "auto_lists":
      return `${share.type}-${share.ownerId}-${share.sharedWith}`;
    case "recipe":
      return `recipe-${share.recipeId}-${share.sharedWith}`;
    case "list":
      return `list-${share.listId}-${share.sharedWith}`;
  }
}

/** Ce qu'il faut à removeShare pour supprimer ce partage. */
function removeTarget(share: ShareRow) {
  switch (share.type) {
    case "library":
    case "auto_lists":
      return { type: share.type, ownerId: share.ownerId, sharedWith: share.sharedWith };
    case "recipe":
      return { type: share.type, recipeId: share.recipeId, sharedWith: share.sharedWith };
    case "list":
      return { type: share.type, listId: share.listId, sharedWith: share.sharedWith };
  }
}

const ICONS = {
  library: BookOpen,
  recipe: UtensilsCrossed,
  list: ListChecks,
  auto_lists: Repeat,
} as const;

function ShareLine({ share, text, label }: { share: ShareRow; text: string; label: string }) {
  const Icon = ICONS[share.type];
  return (
    <li className="flex items-center gap-3 py-3">
      <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">{text}</p>
      <ShareActionButton
        label={label}
        pendingLabel="…"
        onConfirm={removeShare.bind(null, removeTarget(share))}
      />
    </li>
  );
}
