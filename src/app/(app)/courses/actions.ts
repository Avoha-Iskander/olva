"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getShoppingList } from "@/lib/shopping";
import type { ShoppingLine } from "@/lib/shopping-lines";
import { createClient } from "@/lib/supabase/server";

/**
 * Actions du mode courses (US-CRS-01, US-CRS-02).
 * Les droits sont vérifiés par la base : fonctions SQL start_shopping et set_line_checked
 * (créateur ou co-éditeur de la liste), règles RLS pour la lecture.
 */

/** Ouvrir une liste prête en mode courses : elle passe « en courses ». */
export async function startShopping(listId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(listId);
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_shopping", { target_list: id.data });
  return { ok: !error };
}

/** Cocher ou décocher une ligne (qui et quand : notés par la base). */
export async function setLineChecked(lineId: string, value: boolean): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(lineId);
  if (!id.success || typeof value !== "boolean") return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_line_checked", { line_id: id.data, value });
  return { ok: !error };
}

/**
 * Relire les lignes d'une liste : après un ajout venu d'un autre téléphone (le temps réel
 * ne donne pas le nom ni le rayon de l'article) ou au retour d'une coupure.
 */
export async function reloadShoppingLines(
  listId: string,
): Promise<{ lines: ShoppingLine[]; names: Record<string, string> } | null> {
  const id = z.uuid().safeParse(listId);
  if (!id.success) return null;
  const list = await getShoppingList(id.data);
  return list ? { lines: list.lines, names: list.names } : null;
}

/**
 * « Terminer les courses » (US-CRS-03, décision 070) : la liste passe dans l'historique ;
 * si on le demande, les articles non cochés repartent sur une NOUVELLE liste prête, au
 * créateur, avec les mêmes partages (fonction finish_shopping). Renvoie son identifiant.
 */
export async function finishShopping(
  listId: string,
  carryOver: boolean,
): Promise<{ ok: true; newListId: string | null } | { ok: false }> {
  const id = z.uuid().safeParse(listId);
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  // carry_over : nouvelle liste avec les articles non cochés (décision 070)
  const { data: newListId, error } = await supabase.rpc("finish_shopping", {
    target_list: id.data,
    carry_over: carryOver === true,
  });
  if (error) return { ok: false };
  revalidatePath("/listes");
  revalidatePath("/courses");
  return { ok: true, newListId: newListId ?? null };
}
