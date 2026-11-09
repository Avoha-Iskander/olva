"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createShareToken } from "@/lib/share-token";
import { PENDING_SHARE_COOKIE } from "@/lib/share-cookie";
import { createClient } from "@/lib/supabase/server";

/**
 * Ce que l'on partage : une recette, toute ma bibliothèque (en lecture),
 * une liste, mes futures listes (en co-édition), ou tout à la fois : bibliothèque
 * et futures listes (« everything », décision 076).
 */
const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("recipe"), recipeId: z.uuid() }),
  z.object({ kind: z.literal("library") }),
  z.object({ kind: z.literal("list"), listId: z.uuid() }),
  z.object({ kind: z.literal("auto_lists") }),
  z.object({ kind: z.literal("everything") }),
]);
export type ShareTarget = z.infer<typeof targetSchema>;

export type ShareResult = { ok: true; message: string } | { ok: false; message: string };

async function getOrigin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

/**
 * Crée un lien de partage (7 jours, usage unique) et renvoie son adresse.
 * Le jeton n'est jamais enregistré : seulement son empreinte.
 */
export async function createShareLink(
  target: ShareTarget,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const parsed = targetSchema.safeParse(target);
  if (!parsed.success) return { ok: false, message: "Partage impossible." };

  const { token, hash } = createShareToken();
  const supabase = await createClient();
  const { error } = await supabase.from("share_links").insert({
    kind: parsed.data.kind,
    recipe_id: parsed.data.kind === "recipe" ? parsed.data.recipeId : null,
    list_id: parsed.data.kind === "list" ? parsed.data.listId : null,
    token_hash: hash,
  });
  if (error) return { ok: false, message: "La création du lien a échoué. Réessayez." };

  revalidatePath("/parametres");
  return { ok: true, url: `${await getOrigin()}/partage/${token}` };
}

/** Partage directement avec un compte Olva existant, retrouvé par son email. */
export async function shareByEmail(target: ShareTarget, email: string): Promise<ShareResult> {
  const parsedTarget = targetSchema.safeParse(target);
  const parsedEmail = z.email().safeParse(email.trim());
  if (!parsedTarget.success) return { ok: false, message: "Partage impossible." };
  if (!parsedEmail.success) return { ok: false, message: "Saisissez une adresse email valide." };

  const supabase = await createClient();
  const what = parsedTarget.data;

  // Tout partager : bibliothèque puis futures listes, avec les deux fonctions existantes
  if (what.kind === "everything") {
    const recipes = await shareByEmail({ kind: "library" }, parsedEmail.data);
    if (!recipes.ok) return recipes;
    const lists = await shareByEmail({ kind: "auto_lists" }, parsedEmail.data);
    if (!lists.ok) return lists;
    return {
      ok: true,
      message: `Recettes et nouvelles listes partagées avec ${parsedEmail.data}.`,
    };
  }

  // Les types générés ne savent pas qu'un paramètre SQL peut recevoir null
  // (partage de bibliothèque ou de mes futures listes), d'où la conversion explicite
  const none = null as unknown as string;
  const { data: status, error } =
    what.kind === "recipe" || what.kind === "library"
      ? await supabase.rpc("share_by_email", {
          kind: what.kind,
          target_recipe: what.kind === "recipe" ? what.recipeId : none,
          target_email: parsedEmail.data,
        })
      : await supabase.rpc("share_list_by_email", {
          kind: what.kind,
          target_list: what.kind === "list" ? what.listId : none,
          target_email: parsedEmail.data,
        });
  if (error) return { ok: false, message: "Le partage a échoué. Réessayez." };

  revalidatePath("/parametres");
  switch (status) {
    case "shared":
      return { ok: true, message: `C'est partagé avec ${parsedEmail.data}.` };
    case "already":
      return { ok: true, message: `C'était déjà partagé avec ${parsedEmail.data}.` };
    case "self":
      return { ok: false, message: "C'est votre propre adresse." };
    default:
      return {
        ok: false,
        message: "Aucun compte Olva avec cet email. Envoyez-lui plutôt un lien de partage.",
      };
  }
}

/**
 * Accepte un lien de partage (bouton « Ajouter à mes recettes »).
 * En cas de succès, on va dans Mes recettes ; sinon la page du lien se réaffiche
 * avec le bon message (lien expiré, déjà utilisé…).
 */
export async function acceptShareLink(token: string, kind: string) {
  const supabase = await createClient();
  const { data: status } = await supabase.rpc("accept_share_link", { token });

  // Le partage en attente (mémorisé avant l'inscription) est traité
  (await cookies()).delete(PENDING_SHARE_COOKIE);

  if (status === "accepted") {
    // Recettes partagées → Mes recettes ; listes partagées → Mes listes
    // (tout partager : les recettes, visibles tout de suite ; les listes arrivent ensuite)
    const destination = kind === "list" || kind === "auto_lists" ? "/listes" : "/recettes";
    revalidatePath(destination);
    redirect(destination);
  }
  revalidatePath(`/partage/${token}`);
}

const removeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("library"), ownerId: z.uuid(), sharedWith: z.uuid() }),
  z.object({ type: z.literal("recipe"), recipeId: z.uuid(), sharedWith: z.uuid() }),
  z.object({ type: z.literal("list"), listId: z.uuid(), sharedWith: z.uuid() }),
  z.object({ type: z.literal("auto_lists"), ownerId: z.uuid(), sharedWith: z.uuid() }),
]);

/**
 * Retirer un partage (je partage) ou y renoncer (on me partage) : c'est la même
 * suppression, pour les recettes comme pour les listes. Les règles d'accès
 * n'autorisent que les deux personnes concernées.
 */
export async function removeShare(share: z.infer<typeof removeSchema>): Promise<{ ok: boolean }> {
  const parsed = removeSchema.safeParse(share);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const row = parsed.data;
  const { error } =
    row.type === "library"
      ? await supabase
          .from("library_shares")
          .delete()
          .eq("owner_id", row.ownerId)
          .eq("shared_with", row.sharedWith)
      : row.type === "recipe"
        ? await supabase
            .from("recipe_shares")
            .delete()
            .eq("recipe_id", row.recipeId)
            .eq("shared_with", row.sharedWith)
        : row.type === "list"
          ? await supabase
              .from("list_shares")
              .delete()
              .eq("list_id", row.listId)
              .eq("shared_with", row.sharedWith)
          : await supabase
              .from("auto_list_shares")
              .delete()
              .eq("owner_id", row.ownerId)
              .eq("shared_with", row.sharedWith);

  revalidatePath("/parametres");
  revalidatePath("/recettes");
  revalidatePath("/listes");
  return { ok: !error };
}

/** Annuler un lien de partage pas encore utilisé : il ne fonctionnera plus. */
export async function cancelShareLink(linkId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(linkId);
  if (!id.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("share_links").delete().eq("id", id.data);
  revalidatePath("/parametres");
  return { ok: !error };
}
