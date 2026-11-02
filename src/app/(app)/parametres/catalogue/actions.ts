"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isUnitCode } from "@/lib/units";

// « : boolean » : on garde le type string (sinon TypeScript le « rétrécit » aux seuls codes)
const unitCode = z.string().refine((v): boolean => isUnitCode(v), "Unité inconnue");

const settingsSchema = z
  .object({
    itemId: z.uuid(),
    aisleId: z.number().int().positive(),
    isStaple: z.boolean(),
    purchaseUnit: unitCode.nullable(),
    // Seulement pour mes articles personnels
    name: z.string().trim().min(1).max(80).optional(),
    defaultUnit: unitCode.optional(),
  })
  // Un ingrédient de base s'achète par son unité de conditionnement
  .refine((s) => !s.isStaple || s.purchaseUnit, {
    message: "Choisissez l'unité de conditionnement d'un ingrédient de base.",
  });

export type ActionResult = { ok: true } | { ok: false; message: string };

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/**
 * Enregistre les réglages d'un article (US-CAT-03).
 * - Mon article personnel : on le modifie directement.
 * - Article du catalogue commun : on enregistre MA personnalisation (le catalogue
 *   ne change pas pour les autres).
 */
export async function saveItemSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Réglages invalides." };
  }
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, message: "Connexion requise." };
  const s = parsed.data;

  const { data: item } = await supabase
    .from("items")
    .select("owner_id")
    .eq("id", s.itemId)
    .maybeSingle();
  if (!item) return { ok: false, message: "Article introuvable." };

  const { error } =
    item.owner_id === userId
      ? await supabase
          .from("items")
          .update({
            aisle_id: s.aisleId,
            is_staple: s.isStaple,
            purchase_unit: s.isStaple ? s.purchaseUnit : null,
            ...(s.name ? { name: s.name } : {}),
            ...(s.defaultUnit ? { default_unit: s.defaultUnit } : {}),
          })
          .eq("id", s.itemId)
      : await supabase.from("item_overrides").upsert({
          user_id: userId,
          item_id: s.itemId,
          aisle_id: s.aisleId,
          is_staple: s.isStaple,
          purchase_unit: s.isStaple ? s.purchaseUnit : null,
        });

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "Vous avez déjà un article de ce nom."
          : "L'enregistrement a échoué. Réessayez.",
    };
  }
  revalidatePath("/parametres/catalogue");
  return { ok: true };
}

/** Article commun : je retire ma personnalisation, les valeurs du catalogue reviennent. */
export async function resetItemSettings(itemId: string): Promise<ActionResult> {
  const id = z.uuid().safeParse(itemId);
  if (!id.success) return { ok: false, message: "Article introuvable." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("item_overrides").delete().eq("item_id", id.data);
  revalidatePath("/parametres/catalogue");
  return error ? { ok: false, message: "La réinitialisation a échoué." } : { ok: true };
}

const conversionSchema = z
  .object({
    itemId: z.uuid(),
    fromUnit: unitCode,
    toUnit: unitCode,
    factor: z.number().positive().max(100000),
  })
  .refine((c) => c.fromUnit !== c.toUnit, { message: "Choisissez deux unités différentes." });

/** Ajoute une conversion personnelle : 1 fromUnit = factor toUnit (ex. 1 boîte = 400 g). */
export async function addConversion(
  input: z.infer<typeof conversionSchema>,
): Promise<ActionResult & { id?: string }> {
  const parsed = conversionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Conversion invalide." };
  }
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, message: "Connexion requise." };

  const { data, error } = await supabase
    .from("unit_conversions")
    .insert({
      owner_id: userId,
      item_id: parsed.data.itemId,
      from_unit: parsed.data.fromUnit,
      to_unit: parsed.data.toUnit,
      factor: parsed.data.factor,
    })
    .select("id")
    .single();
  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "Vous avez déjà une conversion entre ces deux unités."
          : "L'ajout a échoué. Réessayez.",
    };
  }
  revalidatePath("/parametres/catalogue");
  return { ok: true, id: data.id };
}

/** Supprime une de mes conversions (celles du catalogue ne peuvent pas l'être). */
export async function removeConversion(conversionId: string): Promise<ActionResult> {
  const id = z.uuid().safeParse(conversionId);
  if (!id.success) return { ok: false, message: "Conversion introuvable." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("unit_conversions").delete().eq("id", id.data);
  revalidatePath("/parametres/catalogue");
  return error ? { ok: false, message: "La suppression a échoué." } : { ok: true };
}
