"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProfileFormState } from "@/app/bienvenue/actions";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validation/auth";
import { profileSchema } from "@/lib/validation/profile";

/** Enregistre le nom affiché et le nombre de personnes par défaut. */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState & { success?: string }> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  const displayName = String(formData.get("displayName") ?? "");
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), displayName };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/connexion");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      default_servings: parsed.data.defaultServings,
    })
    .eq("id", userId);

  if (error) return { message: "L'enregistrement a échoué. Réessayez.", displayName };

  // Les pages qui affichent le profil (accueil) seront recalculées
  revalidatePath("/", "layout");
  return { success: "Modifications enregistrées.", displayName: parsed.data.displayName };
}

export type DeleteAccountState = { message?: string };

/** Supprime définitivement le compte, après confirmation par le mot SUPPRIMER. */
export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  if (String(formData.get("confirmation") ?? "").trim() !== "SUPPRIMER") {
    return { message: "Tapez SUPPRIMER en majuscules pour confirmer." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { message: "La suppression a échoué. Réessayez." };

  // Le compte n'existe plus : on efface simplement la session de ce navigateur
  await supabase.auth.signOut({ scope: "local" });
  redirect("/connexion?compte=supprime");
}
