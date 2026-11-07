import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validation/auth";

/**
 * Point d'arrivée des liens envoyés par email (confirmation d'inscription,
 * réinitialisation du mot de passe). Deux formats de lien sont acceptés :
 *
 * - « token_hash » : format de nos modèles d'emails (supabase/templates, décision 066).
 *   Fonctionne depuis n'importe quel navigateur.
 * - « code » : format des emails par défaut de Supabase (projet sans nos modèles, ex. dev).
 *   Le lien passe d'abord par Supabase, qui renvoie ici avec un code à échanger contre
 *   une session. ⚠️ Seulement dans le navigateur qui a fait la demande (clé en cookie).
 *
 * Le paramètre « suite » indique où aller ensuite (ex. /nouveau-mot-de-passe).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(
    searchParams.get("suite") ?? (type === "recovery" ? "/nouveau-mot-de-passe" : "/"),
  );

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (ok) {
    redirectTo.pathname = next;
    return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = "/connexion";
  redirectTo.searchParams.set("erreur", "lien");
  return NextResponse.redirect(redirectTo);
}
