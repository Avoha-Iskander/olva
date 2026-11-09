import { createClient } from "@/lib/supabase/server";

export type CatalogueItem = {
  id: string;
  name: string;
  aisleId: number;
  defaultUnit: string;
  isStaple: boolean;
  purchaseUnit: string | null;
  isPersonal: boolean; // article de mon catalogue personnel
};

export type Aisle = { id: number; name: string; emoji: string };

/**
 * Catalogue visible par l'utilisateur (commun + ses articles), et les rayons.
 * Environ 340 articles : chargés une fois, l'auto-complétion se fait ensuite
 * dans le navigateur, sans attendre le réseau.
 */
export async function getCatalogue(): Promise<{ items: CatalogueItem[]; aisles: Aisle[] }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? "";
  const [{ data: items }, { data: aisles }] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, aisle_id, default_unit, is_staple, purchase_unit, owner_id")
      // Commun + mes articles. Les règles d'accès laissent aussi voir les articles
      // personnels des recettes qu'on me partage : ils n'ont pas leur place ici.
      .or(`owner_id.is.null,owner_id.eq.${userId}`)
      .order("name"),
    supabase.from("aisles").select("id, name, emoji").order("position"),
  ]);

  return {
    items: (items ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      aisleId: i.aisle_id,
      defaultUnit: i.default_unit,
      isStaple: i.is_staple,
      purchaseUnit: i.purchase_unit,
      isPersonal: i.owner_id !== null,
    })),
    aisles: aisles ?? [],
  };
}

/**
 * Emoji de chaque rayon, par nom (US-CAT-06). Les rayons sont communs et peu nombreux
 * (20) : lus une fois par le gabarit de l'app pour tous les titres de rayon.
 */
export async function getAisleEmojis(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("aisles").select("name, emoji");
  return Object.fromEntries((data ?? []).filter((a) => a.emoji).map((a) => [a.name, a.emoji]));
}
