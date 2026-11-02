-- Test des listes de courses — étapes 1 et 2 (lot 3)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Tout est ANNULÉ à la fin (le script se termine volontairement par une
-- « erreur » qui affiche les résultats). Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  bob uuid := '00000000-0000-0000-0000-00000000000b';
  mine uuid := gen_random_uuid(); -- recette d'Alex
  shared uuid := gen_random_uuid(); -- recette de Bob partagée avec Alex
  private_bob uuid := gen_random_uuid(); -- recette de Bob, non partagée
  farine uuid := (select id from public.items where name = 'Farine' and owner_id is null);
  huile uuid := (select id from public.items where name = 'Huile d''olive' and owner_id is null);
  list uuid; n int; q numeric; ok boolean;
begin
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated', now()),
    (bob, 'bob@test.local', 'authenticated', 'authenticated', now());
  insert into public.recipes (id, owner_id, title, servings) values
    (mine, alex, 'Crêpes', 4), (shared, bob, 'Gâteau', 6), (private_bob, bob, 'Secret', 2);
  insert into public.recipe_shares (recipe_id, shared_with) values (shared, alex);

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);

  -- Étape 1
  insert into public.shopping_lists default values returning id into list;
  select count(*) into n from public.shopping_lists where id = list and owner_id = alex and status = 'draft';
  r := r || ('Liste créée en brouillon: ' || (n = 1));
  perform public.set_list_recipes(list, jsonb_build_array(
    jsonb_build_object('recipe_id', mine, 'servings', 4),
    jsonb_build_object('recipe_id', shared, 'servings', 6)));
  select count(*) into n from public.shopping_list_recipes where list_id = list; r := r || ('2 recettes (la mienne + partagée): ' || (n = 2));
  perform public.set_list_recipes(list, jsonb_build_array(jsonb_build_object('recipe_id', mine, 'servings', 8)));
  select servings into n from public.shopping_list_recipes where list_id = list; r := r || ('Recettes remplacées, portions 8: ' || (n = 8));
  begin
    perform public.set_list_recipes(list, jsonb_build_array(jsonb_build_object('recipe_id', private_bob, 'servings', 2)));
    ok := false;
  exception when others then ok := true; end;
  r := r || ('Pas de recette non partagée: ' || ok);

  -- Étape 2
  perform public.save_review(list, jsonb_build_array(
    jsonb_build_object('item_id', farine, 'line_key', farine || ':g', 'origin', 'recipe', 'computed_quantity', 500,
      'quantity', 600, 'unit', 'g', 'included', true, 'adjusted', true, 'changed', false, 'recipe_ids', jsonb_build_array(mine)),
    jsonb_build_object('item_id', huile, 'line_key', huile || ':staple', 'origin', 'staple', 'computed_quantity', 1,
      'quantity', 1, 'unit', 'bouteille', 'included', false, 'adjusted', false, 'changed', false, 'recipe_ids', jsonb_build_array(mine))));
  select count(*) into n from public.shopping_list_items where list_id = list; r := r || ('2 lignes enregistrées: ' || (n = 2));
  select quantity into q from public.shopping_list_items where list_id = list and origin = 'recipe'; r := r || ('Quantité ajustée gardée: ' || (q = 600));
  -- Une ligne d'une autre origine (lot 4) n'est pas effacée par la revue
  insert into public.shopping_list_items (list_id, item_id, line_key, origin, quantity, unit)
    values (list, farine, 'free:' || farine, 'free', 1, 'paquet');
  perform public.save_review(list, '[]'::jsonb);
  select count(*) into n from public.shopping_list_items where list_id = list; r := r || ('Revue vidée, article libre conservé: ' || (n = 1));
  begin
    insert into public.shopping_list_items (list_id, item_id, line_key, origin, quantity, unit)
      values (list, farine, 'x', 'recipe', 0, 'g');
    ok := false;
  exception when others then ok := true; end;
  r := r || ('Quantité 0 refusée: ' || ok);

  -- Bob ne voit ni ne modifie la liste d'Alex
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.shopping_lists where id = list; r := r || ('Bob ne voit pas la liste: ' || (n = 0));
  select count(*) into n from public.shopping_list_items where list_id = list; r := r || ('Ni ses lignes: ' || (n = 0));
  begin perform public.save_review(list, '[]'::jsonb); ok := false; exception when others then ok := true; end;
  r := r || ('Bob ne peut pas enregistrer la revue: ' || ok);
  begin
    insert into public.shopping_list_recipes (list_id, recipe_id, servings, position) values (list, private_bob, 2, 1);
    ok := false;
  exception when others then ok := true; end;
  r := r || ('Bob ne peut pas ajouter de recette: ' || ok);

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
