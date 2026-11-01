"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Send, Share2 } from "lucide-react";

import {
  createShareLink,
  shareByEmail,
  type ShareResult,
  type ShareTarget,
} from "@/app/(app)/partage/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Fenêtre « Partager » : par lien (WhatsApp, SMS…) ou par email (compte Olva existant).
 * Sert pour une recette comme pour toute la bibliothèque (target).
 */
export function ShareDialog({
  target,
  title,
  description,
  open,
  onOpenChange,
}: {
  target: ShareTarget;
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Contenu remonté à chaque ouverture : on repart d'une fenêtre vierge */}
        {open && <ShareOptions target={target} />}
      </DialogContent>
    </Dialog>
  );
}

function ShareOptions({ target }: { target: ShareTarget }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailResult, setEmailResult] = useState<ShareResult | null>(null);
  const [linkPending, startLink] = useTransition();
  const [emailPending, startEmail] = useTransition();

  // Menu de partage du téléphone (WhatsApp, SMS…) : pas disponible partout (ordinateur)
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  function makeLink() {
    startLink(async () => {
      const result = await createShareLink(target);
      if (result.ok) setUrl(result.url);
      else setLinkError(result.message);
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLinkError("Copie impossible : sélectionnez le lien et copiez-le à la main.");
    }
  }

  async function nativeShare() {
    if (!url) return;
    try {
      await navigator.share({ title: "Olva", text: "Je vous partage mes recettes sur Olva", url });
    } catch {
      // Partage annulé par l'utilisateur : rien à faire
    }
  }

  function sendByEmail(event: React.FormEvent) {
    event.preventDefault(); // pas de rechargement de la page
    startEmail(async () => {
      const result = await shareByEmail(target, email);
      setEmailResult(result);
      if (result.ok) setEmail("");
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3" aria-labelledby="share-link-title">
        <h3 id="share-link-title" className="font-medium">
          Envoyer un lien
        </h3>
        {url ? (
          <>
            <Input
              value={url}
              readOnly
              aria-label="Lien de partage"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex flex-wrap gap-3">
              {canNativeShare && (
                <Button type="button" onClick={nativeShare}>
                  <Share2 />
                  Partager…
                </Button>
              )}
              <Button type="button" variant={canNativeShare ? "outline" : "default"} onClick={copy}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copié !" : "Copier le lien"}
              </Button>
            </div>
          </>
        ) : (
          <Button type="button" variant="outline" onClick={makeLink} disabled={linkPending}>
            <Link2 />
            {linkPending ? "Création…" : "Créer un lien de partage"}
          </Button>
        )}
        <p className="text-muted-foreground text-sm">
          Valable 7 jours, pour une seule personne. Elle devra se connecter ou créer un compte.
        </p>
        {linkError && (
          <p role="alert" className="text-destructive text-sm">
            {linkError}
          </p>
        )}
      </section>

      <form className="grid gap-3 border-t pt-6" onSubmit={sendByEmail} noValidate>
        <Label htmlFor="share-email" className="font-medium">
          Ou avec un compte Olva
        </Label>
        <div className="flex gap-2">
          <Input
            id="share-email"
            type="email"
            autoComplete="email"
            placeholder="email@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={emailPending || !email.trim()}>
            <Send />
            <span className="sr-only sm:not-sr-only">Partager</span>
          </Button>
        </div>
        {emailResult && (
          <FormMessage
            message={emailResult.ok ? undefined : emailResult.message}
            success={emailResult.ok ? emailResult.message : undefined}
          />
        )}
      </form>
    </div>
  );
}
