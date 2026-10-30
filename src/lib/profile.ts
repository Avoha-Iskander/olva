import { createClient } from "@/lib/supabase/server";

/**
 * Profil de l'utilisateur connecté (null si personne n'est connecté).
 * Les règles d'accès garantissent qu'on ne peut lire que son propre profil.
 *
 * Filet de sécurité : si un utilisateur connecté n'a pas de profil (compte créé
 * avant la mise en place des profils, incident…), on le crée à la volée plutôt
 * que de le rediriger — une redirection ferait boucler l'application.
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const fetchProfile = () =>
    supabase
      .from("profiles")
      .select("id, display_name, default_servings, onboarded")
      .eq("id", userId)
      .maybeSingle();

  const { data: profile } = await fetchProfile();
  if (profile) return profile;

  await supabase.rpc("ensure_my_profile");
  const { data: created } = await fetchProfile();
  if (!created) {
    // Ne devrait jamais arriver : on affiche une erreur plutôt que de boucler
    throw new Error("Profil introuvable pour l'utilisateur connecté");
  }
  return created;
}
