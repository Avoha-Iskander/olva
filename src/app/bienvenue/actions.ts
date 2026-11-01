"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isShareLinkPath, PENDING_SHARE_COOKIE } from "@/lib/share-cookie";
import { createClient } from "@/lib/supabase/server";
import { type FieldErrors, toFieldErrors } from "@/lib/validation/auth";
import { profileSchema } from "@/lib/validation/profile";

export type ProfileFormState = { errors?: FieldErrors; message?: string; displayName?: string };

/** Enregistre le nom et les portions, marque le parcours d'accueil comme terminé. */
export async function completeOnboarding(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
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
      onboarded: true,
    })
    .eq("id", userId);

  if (error) return { message: "L'enregistrement a échoué. Réessayez.", displayName };

  // Inscription partie d'un lien de partage : on y retourne pour l'accepter
  const pendingShare = (await cookies()).get(PENDING_SHARE_COOKIE)?.value;
  redirect(isShareLinkPath(pendingShare) ? pendingShare : "/");
}
