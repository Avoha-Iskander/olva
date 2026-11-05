"use client";

import { useEffect, useState } from "react";

/**
 * Une « session » de création neuve à chaque retour sur l'écran.
 *
 * Pourquoi ? Next.js garde en mémoire, cachés, les écrans qu'on vient de quitter, pour
 * y revenir instantanément. Pour un écran de CRÉATION (nouvelle recette, import), c'est
 * un piège : en y revenant, on retrouvait le brouillon précédent… et son identifiant de
 * recette, qui aurait pu servir à enregistrer (donc écraser) la même recette.
 *
 * Quand un écran ainsi gardé est caché, React exécute le « nettoyage » de ses effets :
 * on en profite pour préparer une session neuve (nouvelle clé, nouvel identifiant).
 * Au retour, le formulaire est vierge. Le composant qui utilise ce hook passe `key` à
 * son contenu : une clé différente fait repartir React de zéro.
 */
export function useFreshSession(): { key: number; recipeId: string } {
  const [session, setSession] = useState(() => ({ key: 0, recipeId: crypto.randomUUID() }));
  useEffect(() => () => setSession((s) => ({ key: s.key + 1, recipeId: crypto.randomUUID() })), []);
  return session;
}
