-- Test des personnalisations du catalogue (lot 4, US-CAT-03)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Tout est ANNULÉ à la fin. Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  bob uuid := '00000000-0000-0000-0000-00000000000b';
  carole uuid := '00000000-0000-0000-0000-00000000000c';
  sel uuid := (select id from public.items where name = 'Sel' and owner_id is null);
  list uuid; n int; ok boolean;
begin
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated', now()),
    (bob, 'bob@test.local', 'authenticated', 'authenticated', now()),
    (carole, 'carole@test.local', 'authenticated', 'authenticated', now());

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.item_overrides (item_id, aisle_id, is_staple, purchase_unit) values (sel, 21, false, null);
  select count(*) into n from public.item_overrides where user_id = alex; r := r || ('Alex personnalise le sel: ' || (n = 1));
  select count(*) into n from public.items where id = sel and aisle_id <> 21; r := r || ('Le catalogue commun ne change pas: ' || (n = 1));
  begin
    insert into public.item_overrides (item_id, is_staple) values (sel, true) on conflict (user_id, item_id) do update set is_staple = true, purchase_unit = null;
    ok := false;
  exception when others then ok := true; end;
  r := r || ('Ingrédient de base sans conditionnement refusé: ' || ok);
  insert into public.shopping_lists default values returning id into list;
  perform public.finalize_list(list, '[]'::jsonb);
  perform public.share_list_by_email('list', list, 'bob@test.local');

  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.item_overrides where user_id = alex; r := r || ('Bob (co-éditeur) voit les rayons d''Alex: ' || (n = 1));
  begin
    insert into public.item_overrides (user_id, item_id, aisle_id) values (alex, sel, 1);
    ok := false;
  exception when others then ok := true; end;
  r := r || ('Bob ne personnalise pas pour Alex: ' || ok);
  update public.item_overrides set aisle_id = 1 where user_id = alex;
  select count(*) into n from public.item_overrides where user_id = alex and aisle_id = 21; r := r || ('Bob ne modifie pas ceux d''Alex: ' || (n = 1));

  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select count(*) into n from public.item_overrides; r := r || ('Carole ne voit rien: ' || (n = 0));

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
