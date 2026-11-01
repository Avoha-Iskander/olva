"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createShareToken } from "@/lib/share-token";
import { PENDING_SHARE_COOKIE } from "@/lib/share-cookie";
import { createClient } from "@/lib/supabase/server";

/** Ce que l'on partage : une recette, ou toute ma bibliothèque. */
const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("recipe"), recipeId: z.uuid() }),
  z.object({ kind: z.literal("library") }),
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
  const { data: status, error } = await supabase.rpc("share_by_email", {
    kind: parsedTarget.data.kind,
    // Vide pour un partage de bibliothèque : les types générés ne savent pas
    // qu'un paramètre SQL peut recevoir null, d'où la conversion explicite
    target_recipe: (parsedTarget.data.kind === "recipe"
      ? parsedTarget.data.recipeId
      : null) as unknown as string,
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
export async function acceptShareLink(token: string) {
  const supabase = await createClient();
  const { data: status } = await supabase.rpc("accept_share_link", { token });

  // Le partage en attente (mémorisé avant l'inscription) est traité
  (await cookies()).delete(PENDING_SHARE_COOKIE);

  if (status === "accepted") {
    revalidatePath("/recettes");
    redirect("/recettes");
  }
  revalidatePath(`/partage/${token}`);
}
