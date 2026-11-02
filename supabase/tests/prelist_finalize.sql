-- Test de la pré-liste et de « Terminer la liste » (lot 4)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Tout est ANNULÉ à la fin. Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  bob uuid := '00000000-0000-0000-0000-00000000000b';
  lait uuid := (select id from public.items where name = 'Lait demi-écrémé' and owner_id is null);
  list uuid; n int; t text; ok boolean;
begin
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated', now()),
    (bob, 'bob@test.local', 'authenticated', 'authenticated', now());

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);

  -- Pré-liste par défaut, une seule fois
  perform public.ensure_my_prelist();
  select count(*) into n from public.prelist_items; r := r || ('Pré-liste par défaut (15 articles): ' || (n = 15));
  delete from public.prelist_items;
  perform public.ensure_my_prelist();
  select count(*) into n from public.prelist_items; r := r || ('Vidée, elle n''est pas recréée: ' || (n = 0));

  -- Étape 3 puis « Terminer »
  insert into public.shopping_lists default values returning id into list;
  perform public.save_extras(list, jsonb_build_array(
    jsonb_build_object('item_id', lait, 'line_key', 'prelist:' || lait, 'origin', 'prelist', 'quantity', 2, 'unit', 'l')));
  select count(*) into n from public.shopping_list_items where list_id = list and origin = 'prelist'; r := r || ('Ligne pré-liste enregistrée: ' || (n = 1));
  perform public.finalize_list(list, jsonb_build_array(
    jsonb_build_object('item_id', lait, 'origin', 'recipe', 'quantity', 3, 'unit', 'l', 'recipe_ids', jsonb_build_array())));
  select status into t from public.shopping_lists where id = list; r := r || ('Liste prête: ' || (t = 'ready'));
  select count(*) into n from public.shopping_list_items where list_id = list; r := r || ('Une seule ligne regroupée: ' || (n = 1));
  begin perform public.finalize_list(list, '[]'::jsonb); ok := false; exception when others then ok := true; end;
  r := r || ('Pas de deuxième finalisation: ' || ok);

  -- Bob ne voit pas la pré-liste d'Alex
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  perform public.ensure_my_prelist();
  select count(*) into n from public.prelist_items where user_id = alex; r := r || ('Bob ne voit pas la pré-liste d''Alex: ' || (n = 0));
  select count(*) into n from public.prelist_items; r := r || ('Bob a sa propre pré-liste: ' || (n = 15));
  begin perform public.save_extras(list, '[]'::jsonb); ok := false; exception when others then ok := true; end;
  r := r || ('Bob ne modifie pas la liste d''Alex: ' || ok);

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
