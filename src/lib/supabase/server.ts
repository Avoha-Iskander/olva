import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Client Supabase pour le SERVEUR (pages, actions serveur, routes API).
 *
 * La session de l'utilisateur connecté est stockée dans des cookies :
 * on donne donc au client un moyen de lire et d'écrire ces cookies.
 * À recréer à chaque requête (ne jamais le partager entre utilisateurs).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis une page serveur, où l'écriture de cookies est interdite.
          // Sans conséquence : le rafraîchissement de session sera géré au lot 2.
        }
      },
    },
  });
}
