-- Test de la fonction save_recipe (lot 2.4)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Crée un utilisateur fictif, enregistre puis modifie une recette, et ANNULE TOUT
-- (le script se termine volontairement par une « erreur » qui affiche les résultats).
-- Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  rid uuid := gen_random_uuid();
  tomate uuid := (select id from public.items where name = 'Tomate' and owner_id is null);
  sel uuid := (select id from public.items where name = 'Sel' and owner_id is null);
  col uuid; n int; t text; q numeric;
begin
  insert into auth.users (id, email, aud, role) values (alex, 'alex@test.local', 'authenticated', 'authenticated');
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.collections (name) values ('Entrées') returning id into col;

  -- Création
  perform public.save_recipe(jsonb_build_object(
    'id', rid, 'title', 'Salade de tomates', 'servings', 2, 'steps', jsonb_build_array('Couper', 'Assaisonner'),
    'book_title', '', 'book_page', null, 'photo_path', null, 'thumb_path', null,
    'ingredients', jsonb_build_array(
      jsonb_build_object('item_id', tomate, 'quantity', 3, 'unit', 'piece', 'note', 'bien mûres'),
      jsonb_build_object('item_id', sel, 'quantity', null, 'unit', null, 'note', null)),
    'collection_ids', jsonb_build_array(col)));
  select count(*) into n from public.recipes where id = rid; r := r || ('Recette créée: ' || (n = 1));
  select count(*) into n from public.recipe_ingredients where recipe_id = rid; r := r || ('2 ingrédients: ' || (n = 2));
  select count(*) into n from public.recipe_collections where recipe_id = rid; r := r || ('Rangée dans Entrées: ' || (n = 1));
  select book_title into t from public.recipes where id = rid; r := r || ('Livre vide → null: ' || (t is null));

  -- Modification : ordre inversé, quantité changée, plus de collection
  perform public.save_recipe(jsonb_build_object(
    'id', rid, 'title', 'Salade de tomates fraîches', 'servings', 4, 'steps', jsonb_build_array('Couper'),
    'ingredients', jsonb_build_array(
      jsonb_build_object('item_id', sel, 'quantity', null, 'unit', null),
      jsonb_build_object('item_id', tomate, 'quantity', 6, 'unit', 'piece')),
    'collection_ids', jsonb_build_array()));
  select title into t from public.recipes where id = rid; r := r || ('Titre modifié: ' || (t = 'Salade de tomates fraîches'));
  select count(*) into n from public.recipe_ingredients where recipe_id = rid; r := r || ('Toujours 2 ingrédients: ' || (n = 2));
  select quantity into q from public.recipe_ingredients where recipe_id = rid and position = 2; r := r || ('Ordre et quantité mis à jour: ' || (q = 6));
  select count(*) into n from public.recipe_collections where recipe_id = rid; r := r || ('Collection retirée: ' || (n = 0));

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
