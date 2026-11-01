-- Test de la copie d'une recette partagée (lot 2.8)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Alex partage une recette avec Bob, Bob la copie ; tout est ANNULÉ à la fin
-- (le script se termine volontairement par une « erreur » qui affiche les résultats).
-- Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  bob uuid := '00000000-0000-0000-0000-00000000000b';
  carole uuid := '00000000-0000-0000-0000-00000000000c';
  r1 uuid := gen_random_uuid();
  sauce uuid := gen_random_uuid(); -- article perso d'Alex, inconnu de Bob
  pate uuid := gen_random_uuid(); -- article perso d'Alex, que Bob a aussi
  pate_bob uuid := gen_random_uuid();
  sel uuid := (select id from public.items where name = 'Sel' and owner_id is null);
  copie uuid; item uuid; n int; t text; ok boolean;
begin
  -- Préparation (en administrateur)
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated', now()),
    (bob, 'bob@test.local', 'authenticated', 'authenticated', now()),
    (carole, 'carole@test.local', 'authenticated', 'authenticated', now());
  insert into public.items (id, owner_id, name, aisle_id, default_unit) values
    (sauce, alex, 'Sauce secrète', 10, 'cl'),
    (pate, alex, 'Pâte maison', 2, 'piece'),
    (pate_bob, bob, 'pâte maison', 2, 'piece');
  insert into public.unit_conversions (item_id, owner_id, from_unit, to_unit, factor)
    values (sauce, alex, 'bouteille', 'cl', 50);
  insert into public.recipes (id, owner_id, title, servings, steps, book_title, book_page)
    values (r1, alex, 'Tarte de mamie', 6, array['Étaler', 'Cuire'], 'Carnet', 12);
  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit, note) values
    (r1, 1, pate, 1, 'piece', null),
    (r1, 2, sauce, 5, 'cl', 'bien froide'),
    (r1, 3, sel, null, null, null);
  insert into public.recipe_shares (recipe_id, shared_with) values (r1, bob);

  perform set_config('role', 'authenticated', true);

  -- ===== Bob copie la recette
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  copie := public.copy_recipe(r1);
  select count(*) into n from public.recipes where id = copie and owner_id = bob and copied_from = r1 and not is_example;
  r := r || ('La copie est à Bob et pointe vers l''original: ' || (n = 1));
  select count(*) into n from public.recipes
    where id = copie and title = 'Tarte de mamie' and servings = 6 and steps = array['Étaler', 'Cuire'] and book_page = 12;
  r := r || ('Titre, personnes, étapes et livre copiés: ' || (n = 1));
  select count(*) into n from public.recipe_ingredients where recipe_id = copie; r := r || ('3 ingrédients: ' || (n = 3));

  select ri.item_id into item from public.recipe_ingredients ri where ri.recipe_id = copie and ri.position = 2;
  select count(*) into n from public.items where id = item and owner_id = bob and name = 'Sauce secrète';
  r := r || ('Sauce secrète copiée dans le catalogue de Bob: ' || (n = 1));
  select count(*) into n from public.unit_conversions where item_id = item and owner_id = bob and factor = 50;
  r := r || ('Avec sa conversion: ' || (n = 1));
  select note into t from public.recipe_ingredients where recipe_id = copie and position = 2; r := r || ('Remarque copiée: ' || (t = 'bien froide'));

  select ri.item_id into item from public.recipe_ingredients ri where ri.recipe_id = copie and ri.position = 1;
  r := r || ('Pâte maison : article de Bob réutilisé: ' || (item = pate_bob));
  select ri.item_id into item from public.recipe_ingredients ri where ri.recipe_id = copie and ri.position = 3;
  r := r || ('Sel : article commun conservé: ' || (item = sel));
  select count(*) into n from public.items where owner_id = bob; r := r || ('Bob a 2 articles perso (pas de doublon): ' || (n = 2));

  r := r || ('Deuxième copie → la même: ' || (public.copy_recipe(r1) = copie));
  select count(*) into n from public.recipes where owner_id = bob and copied_from = r1; r := r || ('Toujours une seule copie: ' || (n = 1));

  update public.recipes set title = 'Ma tarte' where id = copie;
  select title into t from public.recipes where id = copie; r := r || ('Bob peut modifier sa copie: ' || (t = 'Ma tarte'));
  select title into t from public.recipes where id = r1; r := r || ('L''original est intact: ' || (t = 'Tarte de mamie'));

  -- ===== Carole (rien de partagé) et Alex (sa propre recette) ne peuvent pas copier
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  begin perform public.copy_recipe(r1); ok := false; exception when others then ok := true; end;
  r := r || ('Carole ne peut pas copier: ' || ok);
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  begin perform public.copy_recipe(r1); ok := false; exception when others then ok := true; end;
  r := r || ('Alex ne copie pas sa propre recette: ' || ok);

  -- ===== Alex supprime l'original : la copie de Bob reste (US-CPT-04)
  delete from public.recipes where id = r1;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where id = copie and copied_from is null;
  r := r || ('La copie survit à la suppression de l''original: ' || (n = 1));
  select count(*) into n from public.recipe_ingredients where recipe_id = copie; r := r || ('Avec ses 3 ingrédients: ' || (n = 3));

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
