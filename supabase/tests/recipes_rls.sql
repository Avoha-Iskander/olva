-- Test des règles d'accès des recettes (lot 2.2)
--
-- À exécuter sur olva-dev UNIQUEMENT : Supabase → SQL Editor → coller → Run.
-- Crée 2 utilisateurs fictifs (Alex, Zoé), vérifie qui voit et modifie quoi,
-- puis ANNULE TOUT : le script se termine volontairement par une « erreur »
-- qui affiche les résultats. Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  zoe uuid := '00000000-0000-0000-0000-00000000000e';
  oignon uuid := (select id from public.items where name = 'Oignon' and owner_id is null);
  recette uuid; collection_alex uuid; collection_zoe uuid; perso uuid; n int; t text;
begin
  insert into auth.users (id, email, aud, role) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated'),
    (zoe, 'zoe@test.local', 'authenticated', 'authenticated');

  perform set_config('role', 'authenticated', true);

  -- Alex crée une recette, un article personnel, une collection
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.recipes (title, servings) values ('Soupe à l''oignon', 4) returning id into recette;
  insert into public.items (owner_id, name, aisle_id, default_unit) values (alex, 'Piment de Cayenne', 11, 'pincee') returning id into perso;
  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit) values (recette, 1, oignon, 4, 'piece');
  insert into public.recipe_ingredients (recipe_id, position, item_id) values (recette, 2, perso);
  insert into public.collections (name) values ('Plats d''hiver') returning id into collection_alex;
  insert into public.recipe_collections values (recette, collection_alex);
  select count(*) into n from public.recipe_ingredients where recipe_id = recette; r := r || ('Alex voit ses 2 ingrédients: ' || (n = 2));
  select count(*) into n from public.items where owner_id is null; r := r || ('Alex voit le catalogue commun: ' || (n > 300));
  begin update public.items set name = 'Piraté' where owner_id is null and name = 'Sel';
    select count(*) into n from public.items where name = 'Piraté'; r := r || ('Catalogue commun non modifiable: ' || (n = 0));
  end;
  begin insert into public.recipe_ingredients (recipe_id, position, item_id, quantity) values (recette, 3, oignon, 2); r := r || 'Quantité sans unité refusée: false'::text;
  exception when others then r := r || 'Quantité sans unité refusée: true'::text; end;

  -- Zoé ne voit et ne touche rien d'Alex
  perform set_config('request.jwt.claims', json_build_object('sub', zoe, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes; r := r || ('Zoé ne voit pas la recette d''Alex: ' || (n = 0));
  select count(*) into n from public.recipe_ingredients; r := r || ('Zoé ne voit pas ses ingrédients: ' || (n = 0));
  select count(*) into n from public.collections; r := r || ('Zoé ne voit pas ses collections: ' || (n = 0));
  select count(*) into n from public.items where id = perso; r := r || ('Zoé ne voit pas l''article perso d''Alex: ' || (n = 0));
  update public.recipes set title = 'Piraté' where id = recette;
  delete from public.recipes where id = recette;
  begin insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit) values (recette, 9, oignon, 1, 'piece'); r := r || 'Zoé ne peut pas ajouter d''ingrédient: false'::text;
  exception when others then r := r || 'Zoé ne peut pas ajouter d''ingrédient: true'::text; end;
  insert into public.collections (name) values ('Mes desserts') returning id into collection_zoe;
  begin insert into public.recipe_collections values (recette, collection_zoe); r := r || 'Zoé ne peut pas ranger la recette d''Alex: false'::text;
  exception when others then r := r || 'Zoé ne peut pas ranger la recette d''Alex: true'::text; end;
  begin insert into public.recipes (owner_id, title, servings) values (alex, 'Usurpation', 2); r := r || 'Zoé ne peut pas créer au nom d''Alex: false'::text;
  exception when others then r := r || 'Zoé ne peut pas créer au nom d''Alex: true'::text; end;

  -- Alex vérifie que rien n'a bougé
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  select title into t from public.recipes where id = recette; r := r || ('Titre intact: ' || (t = 'Soupe à l''oignon'));
  begin update public.recipes set owner_id = zoe where id = recette; r := r || 'Propriétaire non modifiable: false'::text;
  exception when others then r := r || 'Propriétaire non modifiable: true'::text; end;

  -- Visiteur non connecté
  perform set_config('role', 'anon', true);
  begin perform count(*) from public.recipes; r := r || 'Visiteur bloqué: false'::text;
  exception when others then r := r || 'Visiteur bloqué: true'::text; end;

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
