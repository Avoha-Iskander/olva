import Link from "next/link";
import { BookOpen, Link2Off, Share2 } from "lucide-react";
import { Suspense } from "react";

import { acceptShareLink } from "@/app/(app)/partage/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listTitle } from "@/lib/list-title";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Partage — Olva" };

/**
 * Page ouverte par un lien de partage. Elle décrit le partage SANS l'accepter :
 * il faut cliquer sur « Ajouter à mes recettes ». Ainsi, l'aperçu automatique
 * d'un lien (WhatsApp, iMessage…) ne peut pas « consommer » le lien à usage unique.
 */
export default function SharePage({ params }: PageProps<"/partage/[token]">) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ShareCard params={params} />
      </Suspense>
    </main>
  );
}

async function ShareCard({ params }: { params: PageProps<"/partage/[token]">["params"] }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_share_link", { token });
  const link = data?.[0];
  const owner = link?.owner_name || "Quelqu'un";
  const isList = link?.kind === "list" || link?.kind === "auto_lists";
  const what =
    link?.kind === "recipe"
      ? `sa recette « ${link.recipe_title} »`
      : link?.kind === "list"
        ? `sa ${listTitle(link.list_created_at).replace("Liste", "liste de courses")}`
        : link?.kind === "auto_lists"
          ? "ses prochaines listes de courses"
          : "toutes ses recettes";

  // Lien utilisable : on propose de l'accepter
  if (link?.status === "valid") {
    // bind : prépare l'action avec le jeton, pour l'utiliser directement dans le formulaire
    const accept = acceptShareLink.bind(null, token, link.kind);
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <Share2 className="text-primary mb-2 size-8" aria-hidden="true" />
          <CardTitle>
            {owner} vous partage {what}
          </CardTitle>
          <CardDescription>
            {link.kind === "recipe"
              ? "Elle apparaîtra dans Mes recettes, en lecture seule."
              : link.kind === "library"
                ? "Elles apparaîtront dans Mes recettes, en lecture seule, y compris celles ajoutées plus tard."
                : link.kind === "list"
                  ? "Elle apparaîtra dans Mes listes : vous pourrez ajouter, retirer et modifier des articles."
                  : "Chaque nouvelle liste terminée apparaîtra dans Mes listes, modifiable par vous deux."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={accept}>
            <Button type="submit" className="w-full">
              <BookOpen />
              {isList ? "Ajouter à mes listes" : "Ajouter à mes recettes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const messages: Record<string, { title: string; text: string }> = {
    accepted: {
      title: "C'est déjà fait",
      text: `Vous avez déjà accepté ce partage. Retrouvez-le dans ${isList ? "Mes listes" : "Mes recettes"}.`,
    },
    own: {
      title: "C'est votre propre lien",
      text: "Envoyez-le à la personne avec qui vous voulez partager.",
    },
    used: {
      title: "Lien déjà utilisé",
      text: `Un lien de partage ne sert qu'une fois. Demandez un nouveau lien à ${owner}.`,
    },
    expired: {
      title: "Lien expiré",
      text: `Un lien de partage est valable 7 jours. Demandez un nouveau lien à ${owner}.`,
    },
  };
  const message = messages[link?.status ?? ""] ?? {
    title: "Lien introuvable",
    text: "Ce lien de partage n'existe pas ou a été annulé. Vérifiez qu'il a été copié en entier.",
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Link2Off className="text-primary mb-2 size-8" aria-hidden="true" />
        <CardTitle>{message.title}</CardTitle>
        <CardDescription>{message.text}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href={isList ? "/listes" : "/recettes"}>
            {isList ? "Mes listes" : "Mes recettes"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
