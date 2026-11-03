import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

import {
  CatalogueManager,
  type Conversion,
  type Override,
} from "@/components/catalogue/catalogue-manager";
import { getCatalogue } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mon catalogue — Olva" };

// Paramètres → Mon catalogue (US-CAT-03) : personnaliser les articles.
export default function CataloguePage() {
  return (
    <main className="mx-auto grid w-full max-w-lg gap-4 px-4 py-6">
      <Link
        href="/parametres"
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Paramètres
      </Link>
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mon catalogue</h1>
        <p className="text-muted-foreground text-sm">
          Rayons, ingrédients de base et conversions, à votre façon.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Manager />
      </Suspense>
    </main>
  );
}

async function Manager() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? "";

  const [catalogue, { data: overrides }, { data: conversions }] = await Promise.all([
    getCatalogue(),
    supabase
      .from("item_overrides")
      .select("item_id, aisle_id, is_staple, purchase_unit")
      .eq("user_id", userId),
    // Conversions du catalogue commun et les miennes (pas celles des autres)
    supabase
      .from("unit_conversions")
      .select("id, item_id, owner_id, from_unit, to_unit, factor")
      .or(`owner_id.is.null,owner_id.eq.${userId}`),
  ]);

  return (
    <CatalogueManager
      items={catalogue.items}
      aisles={catalogue.aisles}
      initialOverrides={Object.fromEntries(
        (overrides ?? []).map((o): [string, Override] => [
          o.item_id,
          { aisleId: o.aisle_id, isStaple: o.is_staple, purchaseUnit: o.purchase_unit },
        ]),
      )}
      initialConversions={(conversions ?? []).map((c): Conversion => ({
        id: c.id,
        itemId: c.item_id,
        mine: c.owner_id === userId,
        fromUnit: c.from_unit,
        toUnit: c.to_unit,
        factor: Number(c.factor),
      }))}
    />
  );
}
