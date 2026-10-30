import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Exécuté par Next.js avant chaque page (voir src/lib/supabase/proxy.ts).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Toutes les pages, sauf les fichiers techniques et les images
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
