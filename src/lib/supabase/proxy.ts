import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/** Pages accessibles sans être connecté. */
const PUBLIC_PATHS = ["/connexion", "/inscription", "/mot-de-passe-oublie", "/auth/confirm"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Le « gardien » appelé avant chaque page :
 * 1. prolonge la session Supabase (les jetons de connexion expirent vite : on les renouvelle ici),
 * 2. renvoie vers /connexion si la page est privée et que personne n'est connecté.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Les jetons renouvelés sont recopiés dans la requête ET dans la réponse
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Important : getClaims vérifie réellement la session (ne pas lire le cookie à la main)
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!isLoggedIn && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/connexion";
    // On mémorise la page demandée pour y revenir après la connexion
    loginUrl.search = `?suite=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && (pathname === "/connexion" || pathname === "/inscription")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
