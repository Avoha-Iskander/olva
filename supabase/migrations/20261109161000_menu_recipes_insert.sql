-- =============================================================================
-- Partage des menus (décision 077) : ajouter à un menu toute recette que je peux LIRE
--
-- La première version n'acceptait que les recettes lisibles sans passer par un menu :
-- dupliquer un menu partagé (qui contient des recettes de l'autre personne) échouait.
-- On revient à la règle d'origine, can_read_recipe : on ne peut ajouter qu'une recette
-- qu'on voit déjà. La vérification a lieu avant l'écriture de la ligne : ajouter une
-- recette à un menu ne peut donc pas, à lui seul, la rendre lisible.
-- =============================================================================

drop policy "Ajouter des recettes aux menus que je peux modifier" on public.menu_recipes;
create policy "Ajouter des recettes aux menus que je peux modifier" on public.menu_recipes
  for insert to authenticated
  with check (private.can_edit_menu(menu_id) and private.can_read_recipe(recipe_id));

drop function private.can_add_recipe_to_menu(uuid);
