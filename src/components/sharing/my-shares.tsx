import { BookOpen, Link2, UtensilsCrossed } from "lucide-react";

import { cancelShareLink, removeShare } from "@/app/(app)/partage/actions";
import { ShareActionButton } from "@/components/sharing/share-action-button";
import type { MyShares, ShareRow } from "@/lib/sharing";

/** Date courte en français : « 8 nov. ». */
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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
            Rien pour l&apos;instant. Partagez une recette depuis sa fiche, ou toutes vos recettes
            depuis Mes recettes.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {shares.sent.map((share) => (
              <ShareLine
                key={rowKey(share)}
                share={share}
                text={
                  share.type === "library"
                    ? `Toutes mes recettes, avec ${share.personName}`
                    : `«\u00a0${share.recipeTitle}\u00a0», avec ${share.personName}`
                }
                label="Retirer"
              />
            ))}
            {shares.pendingLinks.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-3">
                <Link2 className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm">
                  Lien en attente :{" "}
                  {link.recipeTitle ? `«\u00a0${link.recipeTitle}\u00a0»` : "toutes mes recettes"}
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
      </section>

      <section className="grid gap-2 border-t pt-6" aria-labelledby="received-title">
        <h3 id="received-title" className="font-medium">
          On me partage
        </h3>
        {shares.received.length === 0 ? (
          <p className="text-muted-foreground text-sm">Personne ne vous partage de recette.</p>
        ) : (
          <ul className="divide-border divide-y">
            {shares.received.map((share) => (
              <ShareLine
                key={rowKey(share)}
                share={share}
                text={
                  share.type === "library"
                    ? `Toutes les recettes de ${share.personName}`
                    : `«\u00a0${share.recipeTitle}\u00a0», de ${share.personName}`
                }
                label="Renoncer"
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// \u00a0 : espace insécable, pour que « et » ne se retrouvent jamais seuls en début de ligne
function rowKey(share: ShareRow) {
  return share.type === "library"
    ? `library-${share.ownerId}-${share.sharedWith}`
    : `recipe-${share.recipeId}-${share.sharedWith}`;
}

function ShareLine({ share, text, label }: { share: ShareRow; text: string; label: string }) {
  const Icon = share.type === "library" ? BookOpen : UtensilsCrossed;
  const target =
    share.type === "library"
      ? { type: "library" as const, ownerId: share.ownerId, sharedWith: share.sharedWith }
      : { type: "recipe" as const, recipeId: share.recipeId, sharedWith: share.sharedWith };

  return (
    <li className="flex items-center gap-3 py-3">
      <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">{text}</p>
      <ShareActionButton
        label={label}
        pendingLabel="…"
        onConfirm={removeShare.bind(null, target)}
      />
    </li>
  );
}
