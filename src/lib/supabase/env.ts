/**
 * Lit les variables d'environnement Supabase et s'arrête avec un message clair
 * si elles manquent (plutôt qu'une erreur obscure plus loin).
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Variables Supabase manquantes : copie .env.example en .env.local et remplis-le.",
    );
  }
  return { url, publishableKey };
}
