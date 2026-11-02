import { cache } from "react";

import { listTitle } from "@/lib/list-title";
import { createClient } from "@/lib/supabase/server";

/** Une ligne de « Mes partages » : recette, bibliothèque, liste ou listes futures. */
export type ShareRow =
  | { type: "library"; ownerId: string; sharedWith: string; personName: string }
  | {
      type: "recipe";
      recipeId: string;
      recipeTitle: string;
      sharedWith: string;
      personName: string;
    }
  | { type: "list"; listId: string; listName: string; sharedWith: string; personName: string }
  | { type: "auto_lists"; ownerId: string; sharedWith: string; personName: string };

export type PendingLink = {
  id: string;
  label: string; // ce que le lien partage : « Gratin », « toutes mes recettes »…
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

  const [
    { data: libraries },
    { data: recipes },
    { data: lists },
    { data: autoLists },
    { data: links },
  ] = await Promise.all([
    supabase.from("library_shares").select("owner_id, shared_with").order("created_at"),
    // !inner : jointure obligatoire, pour connaître le titre (ou la date) et le propriétaire
    supabase
      .from("recipe_shares")
      .select("recipe_id, shared_with, recipes!inner(title, owner_id)")
      .order("created_at"),
    supabase
      .from("list_shares")
      .select("list_id, shared_with, shopping_lists!inner(created_at, owner_id)")
      .order("created_at"),
    supabase.from("auto_list_shares").select("owner_id, shared_with").order("created_at"),
    supabase
      .from("share_links")
      .select("id, kind, expires_at, recipes(title), shopping_lists(created_at)")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at"),
  ]);

  // Noms de toutes les personnes concernées, en une seule requête
  const pairs: [owner: string, other: string][] = [
    ...(libraries ?? []).map((l) => [l.owner_id, l.shared_with] as [string, string]),
    ...(recipes ?? []).map((r) => [r.recipes.owner_id, r.shared_with] as [string, string]),
    ...(lists ?? []).map((l) => [l.shopping_lists.owner_id, l.shared_with] as [string, string]),
    ...(autoLists ?? []).map((a) => [a.owner_id, a.shared_with] as [string, string]),
  ];
  const otherIds = [...new Set(pairs.map(([owner, other]) => (owner === userId ? other : owner)))];
  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", otherIds)
    : { data: [] as { id: string; display_name: string }[] };
  const nameOf = (id: string) => profiles?.find((p) => p.id === id)?.display_name || "Quelqu'un";

  const sent: ShareRow[] = [];
  const received: ShareRow[] = [];
  // Je suis le propriétaire → « je partage » ; sinon → « on me partage »
  const add = (owner: string, row: ShareRow) => (owner === userId ? sent : received).push(row);
  const person = (owner: string, sharedWith: string) =>
    nameOf(owner === userId ? sharedWith : owner);

  for (const l of libraries ?? []) {
    add(l.owner_id, {
      type: "library",
      ownerId: l.owner_id,
      sharedWith: l.shared_with,
      personName: person(l.owner_id, l.shared_with),
    });
  }
  for (const r of recipes ?? []) {
    add(r.recipes.owner_id, {
      type: "recipe",
      recipeId: r.recipe_id,
      recipeTitle: r.recipes.title,
      sharedWith: r.shared_with,
      personName: person(r.recipes.owner_id, r.shared_with),
    });
  }
  for (const l of lists ?? []) {
    add(l.shopping_lists.owner_id, {
      type: "list",
      listId: l.list_id,
      listName: listTitle(l.shopping_lists.created_at),
      sharedWith: l.shared_with,
      personName: person(l.shopping_lists.owner_id, l.shared_with),
    });
  }
  for (const a of autoLists ?? []) {
    add(a.owner_id, {
      type: "auto_lists",
      ownerId: a.owner_id,
      sharedWith: a.shared_with,
      personName: person(a.owner_id, a.shared_with),
    });
  }

  const linkLabel = (l: NonNullable<typeof links>[number]) => {
    if (l.kind === "recipe") return `« ${l.recipes?.title ?? "recette"} »`;
    if (l.kind === "library") return "toutes mes recettes";
    if (l.kind === "list" && l.shopping_lists) return listTitle(l.shopping_lists.created_at);
    return "mes nouvelles listes";
  };

  return {
    sent,
    received,
    pendingLinks: (links ?? []).map((l) => ({
      id: l.id,
      label: linkLabel(l),
      expiresAt: l.expires_at,
    })),
  };
});
