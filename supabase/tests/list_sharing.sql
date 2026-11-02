-- Test du partage des listes (lot 4)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Tout est ANNULÉ à la fin. Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  bob uuid := '00000000-0000-0000-0000-00000000000b';
  carole uuid := '00000000-0000-0000-0000-00000000000c';
  lait uuid := (select id from public.items where name = 'Lait demi-écrémé' and owner_id is null);
  perso uuid := gen_random_uuid(); -- article personnel d'Alex
  draft uuid; ready uuid; auto_list uuid; n int; t text; ok boolean;
begin
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated', now()),
    (bob, 'bob@test.local', 'authenticated', 'authenticated', now()),
    (carole, 'carole@test.local', 'authenticated', 'authenticated', now());
  update public.profiles set display_name = 'Alex' where id = alex;
  insert into public.items (id, owner_id, name, aisle_id, default_unit) values (perso, alex, 'Sauce maison', 10, 'pot');

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.shopping_lists default values returning id into draft;
  insert into public.shopping_lists default values returning id into ready;
  perform public.finalize_list(ready, jsonb_build_array(
    jsonb_build_object('item_id', lait, 'origin', 'recipe', 'quantity', 2, 'unit', 'l'),
    jsonb_build_object('item_id', perso, 'origin', 'free', 'quantity', 1, 'unit', 'pot')));

  -- Partage par email : seulement une liste prête
  begin perform public.share_list_by_email('list', draft, 'bob@test.local'); ok := false; exception when others then ok := true; end;
  r := r || ('Un brouillon ne se partage pas: ' || ok);
  r := r || ('Liste prête partagée avec Bob: ' || (public.share_list_by_email('list', ready, 'bob@test.local') = 'shared'));
  r := r || ('Déjà partagée: ' || (public.share_list_by_email('list', ready, 'bob@test.local') = 'already'));

  -- Bob co-édite
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.shopping_lists where id = ready; r := r || ('Bob voit la liste: ' || (n = 1));
  select count(*) into n from public.shopping_lists where id = draft; r := r || ('Bob ne voit pas le brouillon: ' || (n = 0));
  select count(*) into n from public.shopping_list_items where list_id = ready; r := r || ('Bob voit les 2 lignes: ' || (n = 2));
  select count(*) into n from public.items where id = perso; r := r || ('Bob voit l''article perso de la liste: ' || (n = 1));
  select display_name into t from public.profiles where id = alex; r := r || ('Bob voit le nom d''Alex: ' || (t = 'Alex'));
  update public.shopping_list_items set quantity = 3 where list_id = ready and item_id = lait;
  select count(*) into n from public.shopping_list_items where list_id = ready and quantity = 3; r := r || ('Bob modifie une quantité: ' || (n = 1));
  insert into public.shopping_list_items (list_id, item_id, line_key, origin, quantity, unit)
    values (ready, lait, 'extra:bob', 'free', 1, 'l');
  select count(*) into n from public.shopping_list_items where list_id = ready; r := r || ('Bob ajoute une ligne: ' || (n = 3));
  update public.shopping_lists set status = 'done' where id = ready;
  select status into t from public.shopping_lists where id = ready; r := r || ('Bob ne change pas le statut: ' || (t = 'ready'));
  begin perform public.share_list_by_email('list', ready, 'carole@test.local'); ok := false; exception when others then ok := true; end;
  r := r || ('Bob ne repartage pas la liste: ' || ok);

  -- Carole ne voit rien
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select count(*) into n from public.shopping_list_items where list_id = ready; r := r || ('Carole ne voit rien: ' || (n = 0));
  begin
    insert into public.shopping_list_items (list_id, item_id, line_key, origin, quantity, unit)
      values (ready, lait, 'extra:carole', 'free', 1, 'l');
    ok := false;
  exception when others then ok := true; end;
  r := r || ('Carole ne peut rien ajouter: ' || ok);

  -- Partage automatique : Alex partage ses futures listes avec Carole (par lien)
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.share_links (kind, token_hash) values ('auto_lists', private.hash_token('lien-auto'));
  begin
    insert into public.share_links (kind, list_id, token_hash) values ('list', draft, private.hash_token('lien-brouillon'));
    ok := false;
  exception when others then ok := true; end;
  r := r || ('Pas de lien pour un brouillon: ' || ok);
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  r := r || ('Carole accepte le partage automatique: ' || (public.accept_share_link('lien-auto') = 'accepted'));
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.shopping_lists default values returning id into auto_list;
  perform public.finalize_list(auto_list, '[]'::jsonb);
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select count(*) into n from public.shopping_lists where id = auto_list; r := r || ('Carole voit la nouvelle liste (auto): ' || (n = 1));
  select count(*) into n from public.shopping_lists where id = ready; r := r || ('… mais pas l''ancienne: ' || (n = 0));

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
