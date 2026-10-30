import { createClient } from "@/lib/supabase/server";

/**
 * Profil de l'utilisateur connecté (null si personne n'est connecté).
 * Les règles d'accès garantissent qu'on ne peut lire que son propre profil.
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, default_servings, onboarded")
    .eq("id", userId)
    .single();

  return profile;
}
