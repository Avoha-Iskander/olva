"use client";

import { createContext, useContext } from "react";

/**
 * Emoji de chaque rayon, par nom de rayon (« Fruits et légumes » → « 🥦 »), US-CAT-06.
 *
 * Les rayons sont communs à tous : on les lit une seule fois dans le gabarit de l'app
 * et on les met à disposition de tous les titres de rayon grâce à un « contexte » React
 * (une valeur partagée par tous les composants placés en dessous, sans la passer de
 * parent en enfant). Sans contexte (ex. une page hors du gabarit), pas d'emoji.
 */
const AisleEmojisContext = createContext<Record<string, string>>({});

export function AisleEmojisProvider({
  emojis,
  children,
}: {
  emojis: Record<string, string>;
  children: React.ReactNode;
}) {
  return <AisleEmojisContext.Provider value={emojis}>{children}</AisleEmojisContext.Provider>;
}

export function useAisleEmojis(): Record<string, string> {
  return useContext(AisleEmojisContext);
}
