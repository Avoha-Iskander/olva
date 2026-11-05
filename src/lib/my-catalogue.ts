/**
 * « Mon catalogue » (décision 061) : le SEUL endroit qui lit en base ce que l'app sait
 * de mes articles, et le combine dans le bon ordre de priorité.
 *
 * Six sources, d'où l'intérêt d'un module unique :
 * - les articles communs et mes articles personnels ;
 * - mes personnalisations d'articles communs (rayon, ingrédient de base, conditionnement) ;
 * - les conversions communes et les miennes (les miennes d'abord) ;
 * - les synonymes communs et les miens.
 *
 * Les règles de priorité elles-mêmes sont des fonctions pures, testées à part
 * (catalogue-overrides.ts, match-ingredients.ts) ; ce module ne fait que lire et assembler.
 */
import { getCatalogue } from "@/lib/catalogue";
import {
  type AisleInfo,
  applyOverride,
  conversionsByItem,
  type ItemOverride,
} from "@/lib/catalogue-overrides";
import type { ReviewItem } from "@/lib/review";
import type { createClient } from "@/lib/supabase/server";
import type { ItemConversion } from "@/lib/units";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Identifiant de l'utilisateur connecté (null : non connecté). */
export async function currentUserId(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/**
 * Personnalisations (US-CAT-03) d'une personne pour ces articles, et tous les rayons
 * (nom + ordre). Pour une liste partagée, on passe le créateur de la liste : elle est
 * triée selon SES rayons (SPEC §3.1).
 */
export async function loadOverrides(supabase: Supabase, userId: string | null, itemIds: string[]) {
  const [{ data: overrides }, { data: aisles }] = await Promise.all([
    userId && itemIds.length
      ? supabase
          .from("item_overrides")
          .select("item_id, aisle_id, is_staple, purchase_unit")
          .eq("user_id", userId)
          .in("item_id", itemIds)
      : Promise.resolve({ data: [] }),
    supabase.from("aisles").select("id, name, position"),
  ]);
  return {
    overrides: new Map<string, ItemOverride>(
      (overrides ?? []).map((o) => [
        o.item_id,
        {
          itemId: o.item_id,
          aisleId: o.aisle_id,
          isStaple: o.is_staple,
          purchaseUnit: o.purchase_unit,
        },
      ]),
    ),
    aisles: new Map<number, AisleInfo>(
      (aisles ?? []).map((a) => [a.id, { name: a.name, position: a.position }]),
    ),
  };
}

/**
 * Conversions par article, les miennes d'abord. Sans liste d'articles : toutes celles
 * que je vois (communes + les miennes, les règles d'accès ne montrent rien d'autre).
 */
export async function loadConversions(
  supabase: Supabase,
  userId: string | null,
  itemIds?: string[],
): Promise<Map<string, ItemConversion[]>> {
  if (itemIds && !itemIds.length) return new Map();
  const query = supabase
    .from("unit_conversions")
    .select("item_id, owner_id, from_unit, to_unit, factor");
  const { data } = await (itemIds ? query.in("item_id", itemIds) : query);
  return conversionsByItem(data ?? [], userId);
}

/**
 * Détail de ces articles, tel que je le vois : nom, unité, rayon et ingrédient de base
 * (mes personnalisations appliquées), conversions (les miennes d'abord).
 * Sert au calcul de la revue des ingrédients (étape 2).
 */
export async function loadItemsDetails(
  supabase: Supabase,
  itemIds: string[],
): Promise<Map<string, ReviewItem>> {
  if (!itemIds.length) return new Map();
  const userId = await currentUserId(supabase);
  const [{ data: items }, conversions, { overrides, aisles }] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, aisle_id, default_unit, is_staple, purchase_unit, aisles(name, position)")
      .in("id", itemIds),
    loadConversions(supabase, userId, itemIds),
    loadOverrides(supabase, userId, itemIds),
  ]);

  return new Map(
    (items ?? []).map((i) => [
      i.id,
      applyOverride(
        {
          id: i.id,
          name: i.name,
          aisleId: i.aisle_id,
          aislePosition: i.aisles?.position ?? 99,
          aisleName: i.aisles?.name,
          defaultUnit: i.default_unit,
          isStaple: i.is_staple,
          purchaseUnit: i.purchase_unit,
          conversions: conversions.get(i.id) ?? [],
        },
        overrides.get(i.id),
        aisles,
      ),
    ]),
  );
}

/**
 * Tout mon catalogue, pour l'import d'une recette (US-CAT-05) : articles (communs +
 * les miens) et rayons, synonymes communs et les miens, conversions.
 */
export async function loadMyCatalogue(supabase: Supabase) {
  const userId = await currentUserId(supabase);
  const [catalogue, { data: aliases }, { data: myAliases }, conversions] = await Promise.all([
    getCatalogue(),
    supabase.from("item_aliases").select("alias, item_id"),
    supabase.from("my_item_aliases").select("alias, item_id"),
    loadConversions(supabase, userId),
  ]);
  const toAlias = (a: { alias: string; item_id: string }) => ({
    alias: a.alias,
    itemId: a.item_id,
  });
  return {
    items: catalogue.items,
    aisles: catalogue.aisles,
    aliases: (aliases ?? []).map(toAlias),
    myAliases: (myAliases ?? []).map(toAlias),
    conversions,
  };
}
