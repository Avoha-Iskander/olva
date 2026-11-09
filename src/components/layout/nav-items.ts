import { BookOpen, ListChecks, ShoppingCart, UtensilsCrossed } from "lucide-react";

/** Les 4 entrées du menu principal (SPEC §5, décision 068). */
export const NAV_ITEMS = [
  { href: "/recettes", label: "Mes recettes", shortLabel: "Recettes", icon: BookOpen },
  { href: "/menus", label: "Menus", shortLabel: "Menus", icon: UtensilsCrossed },
  { href: "/listes", label: "Mes listes", shortLabel: "Listes", icon: ListChecks },
  { href: "/courses", label: "Mes courses", shortLabel: "Courses", icon: ShoppingCart },
] as const;

/** L'entrée du menu est-elle active pour cette adresse ? (/recettes reste actif sur /recettes/123) */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
