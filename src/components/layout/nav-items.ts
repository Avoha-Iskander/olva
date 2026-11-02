import { BookOpen, ListChecks, ListPlus, ShoppingCart } from "lucide-react";

/** Les 4 entrées du menu principal (SPEC §5). */
export const NAV_ITEMS = [
  { href: "/recettes", label: "Mes recettes", shortLabel: "Recettes", icon: BookOpen },
  { href: "/nouvelle-liste", label: "Créer une liste", shortLabel: "Créer", icon: ListPlus },
  { href: "/listes", label: "Mes listes en cours", shortLabel: "Listes", icon: ListChecks },
  { href: "/courses", label: "Faire ses courses", shortLabel: "Courses", icon: ShoppingCart },
] as const;

/** Étapes de préparation d'une liste : /listes/<id>/recettes, /revue, /pre-liste. */
const LIST_STEPS = /^\/listes\/[^/]+\/(recettes|revue|pre-liste)$/;

/**
 * L'entrée du menu est-elle active pour cette adresse ? (/recettes reste actif sur /recettes/123)
 * Préparer une liste, même enregistrée, c'est toujours « Créer » et pas « Listes ».
 */
export function isNavActive(pathname: string, href: string): boolean {
  if (LIST_STEPS.test(pathname)) return href === "/nouvelle-liste";
  return pathname === href || pathname.startsWith(`${href}/`);
}
