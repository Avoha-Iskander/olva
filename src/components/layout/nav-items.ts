import { BookOpen, ListChecks, ShoppingCart, UtensilsCrossed } from "lucide-react";

/** Les 4 entrées du menu principal (SPEC §5, décisions 068 et 073) : un seul nom court par entrée. */
export const NAV_ITEMS = [
  { href: "/recettes", label: "Recettes", icon: BookOpen },
  { href: "/menus", label: "Menus", icon: UtensilsCrossed },
  { href: "/listes", label: "Listes", icon: ListChecks },
  { href: "/courses", label: "Courses", icon: ShoppingCart },
] as const;

/** L'entrée du menu est-elle active pour cette adresse ? (/recettes reste actif sur /recettes/123) */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
