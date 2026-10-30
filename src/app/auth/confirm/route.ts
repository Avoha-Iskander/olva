import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validation/auth";

/**
 * Point d'arrivée des liens envoyés par email (confirmation d'inscription,
 * réinitialisation du mot de passe). Deux formats de lien sont acceptés :
 *
 * - « code » : format des emails par défaut de Supabase. Le lien passe d'abord
 *   par Supabase, qui renvoie ici avec un code à échanger contre une session.
 *   ⚠️ Fonctionne seulement si le lien est ouvert dans le navigateur qui a fait
 *   la demande (une clé secrète y a été déposée dans un cookie).
 * - « token_hash » : format des modèles d'emails personnalisés (quand un service
 *   d'envoi sera configuré). Fonctionne depuis n'importe quel navigateur.
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
