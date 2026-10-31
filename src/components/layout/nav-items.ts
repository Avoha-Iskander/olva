import { BookOpen, ListChecks, ListPlus, ShoppingCart } from "lucide-react";

/** Les 4 entrées du menu principal (SPEC §5). */
export const NAV_ITEMS = [
  { href: "/recettes", label: "Mes recettes", shortLabel: "Recettes", icon: BookOpen },
  { href: "/nouvelle-liste", label: "Créer une liste", shortLabel: "Créer", icon: ListPlus },
  { href: "/listes", label: "Mes listes en cours", shortLabel: "Listes", icon: ListChecks },
  { href: "/courses", label: "Faire ses courses", shortLabel: "Courses", icon: ShoppingCart },
] as const;
