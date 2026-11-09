-- Test du partage des menus en co-édition (décision 077)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Tout est ANNULÉ à la fin. Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  bob uuid := '00000000-0000-0000-0000-00000000000b';
  carole uuid := '00000000-0000-0000-0000-00000000000c';
  menu uuid; menu2 uuid; quiche uuid := gen_random_uuid(); tarte uuid := gen_random_uuid();
  secret uuid := gen_random_uuid(); list uuid; n int; ok boolean;
begin
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated', now()),
    (bob, 'bob@test.local', 'authenticated', 'authenticated', now()),
    (carole, 'carole@test.local', 'authenticated', 'authenticated', now());
  insert into public.recipes (id, owner_id, title, servings) values
    (quiche, alex, 'Quiche d''Alex', 4), (tarte, bob, 'Tarte de Bob', 6), (secret, carole, 'Secret', 2);

  perform set_config('role', 'authenticated', true);

  -- Alex crée un menu avec sa quiche et le partage avec Bob
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.menus (name) values ('Semaine') returning id into menu;
  insert into public.menu_recipes (menu_id, recipe_id, servings) values (menu, quiche, 4);
  r := r || ('Partage par email: ' || (public.share_menu_by_email('menu', menu, 'bob@test.local') = 'shared'));

  -- Bob voit le menu et la quiche, ajoute sa tarte, change une portion
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.menus where id = menu; r := r || ('Bob voit le menu: ' || (n = 1));
  select count(*) into n from public.recipes where id = quiche; r := r || ('Bob lit la quiche du menu: ' || (n = 1));
  insert into public.menu_recipes (menu_id, recipe_id, servings) values (menu, tarte, 6);
  update public.menu_recipes set servings = 2 where menu_id = menu and recipe_id = quiche;
  select servings into n from public.menu_recipes where menu_id = menu and recipe_id = quiche; r := r || ('Bob change les portions: ' || (n = 2));
  begin
    insert into public.menu_recipes (menu_id, recipe_id, servings) values (menu, secret, 2); ok := false;
  exception when others then ok := true; end;
  r := r || ('Bob ne peut pas ajouter une recette qu''il ne voit pas: ' || ok);
  delete from public.menus where id = menu;
  select count(*) into n from public.menus where id = menu; r := r || ('Bob ne supprime pas le menu: ' || (n = 1));
  insert into public.shopping_lists (menu_id) values (menu) returning id into list;
  r := r || 'Bob crée sa liste depuis le menu partagé: true';
  insert into public.menus (name) values ('Copie de Bob') returning id into menu2;
  insert into public.menu_recipes (menu_id, recipe_id, servings) values (menu2, quiche, 4);
  r := r || 'Bob duplique le menu (recette d''Alex comprise): true';

  -- Alex voit la tarte ajoutée par Bob ; Carole ne voit rien
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where id = tarte; r := r || ('Alex lit la tarte ajoutée par Bob: ' || (n = 1));
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select count(*) into n from public.menus where id = menu; r := r || ('Carole ne voit pas le menu: ' || (n = 0));
  select count(*) into n from public.recipes where id in (quiche, tarte); r := r || ('Carole ne lit pas ses recettes: ' || (n = 0));

  -- Partage automatique : le prochain menu d'Alex est partagé avec Carole
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  r := r || ('Partage automatique par email: ' || (public.share_menu_by_email('auto_menus', null, 'carole@test.local') = 'shared'));
  insert into public.menus (name) values ('Semaine 2') returning id into menu2;
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select count(*) into n from public.menus where id = menu2; r := r || ('Carole voit le nouveau menu: ' || (n = 1));
  select count(*) into n from public.menus where id = menu; r := r || ('… mais pas l''ancien: ' || (n = 0));

  -- Bob renonce au menu : il ne le voit plus, ni la quiche
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  delete from public.menu_shares where menu_id = menu and shared_with = bob;
  select count(*) into n from public.menus where id = menu; r := r || ('Bob a renoncé au menu: ' || (n = 0));

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
