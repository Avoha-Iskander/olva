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

export type Aisle = { id: number; name: string };

/**
 * Catalogue visible par l'utilisateur (commun + ses articles), et les rayons.
 * Environ 340 articles : chargés une fois, l'auto-complétion se fait ensuite
 * dans le navigateur, sans attendre le réseau.
 */
export async function getCatalogue(): Promise<{ items: CatalogueItem[]; aisles: Aisle[] }> {
  const supabase = await createClient();
  const [{ data: items }, { data: aisles }] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, aisle_id, default_unit, is_staple, purchase_unit, owner_id")
      .order("name"),
    supabase.from("aisles").select("id, name").order("position"),
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
