import { redirect } from "next/navigation";

// Ancienne adresse de « Créer une liste » (favoris, app installée) : les listes avec
// recettes se créent maintenant depuis un menu (décision 068).
export default function NewListPage() {
  redirect("/menus");
}
