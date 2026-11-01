import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** Une ligne de « Mes partages ». */
export type ShareRow =
  | { type: "library"; ownerId: string; sharedWith: string; personName: string }
  | {
      type: "recipe";
      recipeId: string;
      recipeTitle: string;
      sharedWith: string;
      personName: string;
    };

export type PendingLink = {
  id: string;
  recipeTitle: string | null; // null : lien « toutes mes recettes »
  expiresAt: string;
};

export type MyShares = {
  sent: ShareRow[]; // ce que je partage
  received: ShareRow[]; // ce qu'on me partage
  pendingLinks: PendingLink[]; // liens créés, pas encore utilisés ni expirés
};

/**
 * Tout ce qui concerne mes partages, pour Paramètres → Mes partages.
 * Les règles d'accès ne renvoient que les partages où je suis l'une des deux personnes.
 * cache (React) : appelée deux fois dans la page Paramètres, la lecture n'a lieu qu'une fois.
 */
export const getMyShares = cache(async function getMyShares(): Promise<MyShares> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { sent: [], received: [], pendingLinks: [] };

  const [{ data: libraries }, { data: recipes }, { data: links }] = await Promise.all([
    supabase.from("library_shares").select("owner_id, shared_with").order("created_at"),
    // recipes!inner : jointure obligatoire, pour connaître le titre et le propriétaire
    supabase
      .from("recipe_shares")
      .select("recipe_id, shared_with, recipes!inner(title, owner_id)")
      .order("created_at"),
    supabase
      .from("share_links")
      .select("id, expires_at, recipes(title)")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at"),
  ]);

  // Noms de toutes les personnes concernées, en une seule requête
  const otherIds = new Set<string>();
  libraries?.forEach((l) => otherIds.add(l.owner_id === userId ? l.shared_with : l.owner_id));
  recipes?.forEach((r) =>
    otherIds.add(r.recipes.owner_id === userId ? r.shared_with : r.recipes.owner_id),
  );
  const { data: profiles } = otherIds.size
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", [...otherIds])
    : { data: [] as { id: string; display_name: string }[] };
  const nameOf = (id: string) => profiles?.find((p) => p.id === id)?.display_name || "Quelqu'un";

  const sent: ShareRow[] = [];
  const received: ShareRow[] = [];

  for (const l of libraries ?? []) {
    const mine = l.owner_id === userId;
    (mine ? sent : received).push({
      type: "library",
      ownerId: l.owner_id,
      sharedWith: l.shared_with,
      personName: nameOf(mine ? l.shared_with : l.owner_id),
    });
  }
  for (const r of recipes ?? []) {
    const mine = r.recipes.owner_id === userId;
    (mine ? sent : received).push({
      type: "recipe",
      recipeId: r.recipe_id,
      recipeTitle: r.recipes.title,
      sharedWith: r.shared_with,
      personName: nameOf(mine ? r.shared_with : r.recipes.owner_id),
    });
  }

  return {
    sent,
    received,
    pendingLinks: (links ?? []).map((l) => ({
      id: l.id,
      recipeTitle: l.recipes?.title ?? null,
      expiresAt: l.expires_at,
    })),
  };
});
