import { type NextRequest, NextResponse } from "next/server";

import { readSharedInput } from "@/lib/url-import/shared-link";

/**
 * Point d'arrivée du partage vers Olva (décision 065) :
 * - Android : le menu « Partager » envoie ici (manifest, share_target) ;
 * - iPhone : le Raccourci « Ajouter à Olva » ouvre cette adresse.
 * On y retrouve le lien (ou le texte) envoyé, puis on ouvre « Depuis un lien », qui le lit
 * aussitôt. Non connecté : la connexion se fait d'abord, l'adresse est gardée (proxy).
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shared = readSharedInput({
    url: params.get("url"),
    text: params.get("text"),
    title: params.get("title"),
  });

  const target = new URL("/recettes/lien", request.nextUrl.origin);
  if (shared && "url" in shared) target.searchParams.set("url", shared.url);
  else if (shared) target.searchParams.set("texte", shared.text);
  return NextResponse.redirect(target);
}
