import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Point d'arrivée des liens envoyés par email (confirmation d'inscription,
 * réinitialisation du mot de passe). Le lien contient un jeton à usage unique :
 * on le fait vérifier par Supabase, ce qui ouvre la session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      // Réinitialisation → page de choix du nouveau mot de passe ; sinon → accueil
      redirectTo.pathname = type === "recovery" ? "/nouveau-mot-de-passe" : "/";
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/connexion";
  redirectTo.searchParams.set("erreur", "lien");
  return NextResponse.redirect(redirectTo);
}
