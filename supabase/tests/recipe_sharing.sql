-- Test du partage des recettes (lot 2.7)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Crée trois utilisateurs fictifs (Alex partage, Bob et Carole reçoivent), et
-- ANNULE TOUT (le script se termine volontairement par une « erreur » qui
-- affiche les résultats). Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  bob uuid := '00000000-0000-0000-0000-00000000000b';
  carole uuid := '00000000-0000-0000-0000-00000000000c';
  r1 uuid := gen_random_uuid(); -- recette partagée seule avec Bob
  r2 uuid := gen_random_uuid(); -- recette visible seulement via la bibliothèque
  r3 uuid := gen_random_uuid(); -- recette créée APRÈS le partage de bibliothèque
  perso uuid := gen_random_uuid(); -- article personnel d'Alex
  ex uuid;
  n int; t text; ok boolean;
begin
  -- Préparation (en administrateur)
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated', now()),
    (bob, 'bob@test.local', 'authenticated', 'authenticated', now()),
    (carole, 'carole@test.local', 'authenticated', 'authenticated', now());
  update public.profiles set display_name = 'Alex' where id = alex;
  insert into public.items (id, owner_id, name, aisle_id, default_unit)
    values (perso, alex, 'Sauce secrète', 1, 'cl');
  insert into public.recipes (id, owner_id, title, servings) values
    (r1, alex, 'Tarte', 4), (r2, alex, 'Soupe', 2);
  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit)
    values (r1, 1, perso, 5, 'cl');
  select id into ex from public.recipes where owner_id = alex and is_example limit 1;
  -- Lien déjà expiré (impossible à créer depuis l'application)
  insert into public.share_links (owner_id, kind, token_hash, expires_at)
    values (alex, 'library', private.hash_token('lien-expire'), now() - interval '1 day');

  perform set_config('role', 'authenticated', true);

  -- ===== Bob, avant tout partage
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where owner_id = alex; r := r || ('Bob ne voit rien d''Alex au départ: ' || (n = 0));
  select count(*) into n from public.items where id = perso; r := r || ('Bob ne voit pas l''article perso: ' || (n = 0));

  -- ===== Alex partage par email
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  r := r || ('Partage à Bob: ' || (public.share_by_email('recipe', r1, ' BOB@test.local ') = 'shared'));
  r := r || ('Deuxième fois → déjà partagé: ' || (public.share_by_email('recipe', r1, 'bob@test.local') = 'already'));
  r := r || ('Email inconnu → pas de compte: ' || (public.share_by_email('recipe', r1, 'inconnu@test.local') = 'no_account'));
  r := r || ('Mon propre email → refusé: ' || (public.share_by_email('recipe', r1, 'alex@test.local') = 'self'));
  begin
    perform public.share_by_email('recipe', ex, 'bob@test.local'); ok := false;
  exception when others then ok := true; end;
  r := r || ('Un exemple ne se partage pas: ' || ok);

  -- ===== Bob voit la recette partagée, en lecture seule
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where owner_id = alex; r := r || ('Bob voit 1 recette d''Alex: ' || (n = 1));
  select count(*) into n from public.recipe_ingredients where recipe_id = r1; r := r || ('Bob voit ses ingrédients: ' || (n = 1));
  select count(*) into n from public.items where id = perso; r := r || ('Bob voit l''article perso utilisé: ' || (n = 1));
  select display_name into t from public.profiles where id = alex; r := r || ('Bob voit le nom d''Alex: ' || (t = 'Alex'));
  update public.recipes set title = 'Piratée' where id = r1;
  select title into t from public.recipes where id = r1; r := r || ('Bob ne peut pas modifier: ' || (t = 'Tarte'));
  delete from public.recipes where id = r1;
  select count(*) into n from public.recipes where id = r1; r := r || ('Bob ne peut pas supprimer: ' || (n = 1));
  begin
    insert into public.recipe_shares (recipe_id, shared_with) values (r2, bob); ok := false;
  exception when others then ok := true; end;
  r := r || ('Bob ne peut pas se partager une recette: ' || ok);
  select count(*) into n from public.recipes where is_example and owner_id = alex; r := r || ('Bob ne voit pas les exemples d''Alex: ' || (n = 0));

  -- ===== Carole ne voit rien
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where owner_id = alex; r := r || ('Carole ne voit rien: ' || (n = 0));
  select count(*) into n from public.profiles where id = alex; r := r || ('Carole ne voit pas le nom d''Alex: ' || (n = 0));

  -- ===== Alex crée un lien « bibliothèque »
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.share_links (kind, token_hash) values ('library', private.hash_token('lien-biblio'));
  select status into t from public.preview_share_link('lien-biblio'); r := r || ('Alex ouvre son propre lien: ' || (t = 'own'));
  begin
    insert into public.share_links (kind, recipe_id, token_hash) values ('recipe', ex, private.hash_token('lien-exemple')); ok := false;
  exception when others then ok := true; end;
  r := r || ('Pas de lien pour un exemple: ' || ok);

  -- ===== Carole accepte le lien
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select status into t from public.preview_share_link('lien-biblio'); r := r || ('Aperçu valide: ' || (t = 'valid'));
  select owner_name into t from public.preview_share_link('lien-biblio'); r := r || ('Aperçu avec le nom d''Alex: ' || (t = 'Alex'));
  select count(*) into n from public.recipes where owner_id = alex; r := r || ('Aperçu ne donne pas accès: ' || (n = 0));
  r := r || ('Carole accepte: ' || (public.accept_share_link('lien-biblio') = 'accepted'));
  select count(*) into n from public.recipes where owner_id = alex; r := r || ('Carole voit Tarte et Soupe (pas les exemples): ' || (n = 2));
  r := r || ('Lien inconnu: ' || (public.accept_share_link('lien-bidon') = 'invalid'));
  r := r || ('Lien expiré: ' || (public.accept_share_link('lien-expire') = 'expired'));
  select count(*) into n from public.share_links; r := r || ('Carole ne voit pas les liens d''Alex: ' || (n = 0));

  -- ===== Bob essaie le même lien
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  r := r || ('Lien déjà utilisé: ' || (public.accept_share_link('lien-biblio') = 'used'));

  -- ===== Alex crée une nouvelle recette : Carole la voit (bibliothèque), pas Bob
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  insert into public.recipes (id, title, servings) values (r3, 'Gâteau', 6);
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where id = r3; r := r || ('Carole voit la nouvelle recette: ' || (n = 1));
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where id = r3; r := r || ('Bob ne la voit pas: ' || (n = 0));

  -- ===== Bob renonce ; Alex retire le partage de Carole
  delete from public.recipe_shares where recipe_id = r1;
  select count(*) into n from public.recipes where owner_id = alex; r := r || ('Bob a renoncé: ' || (n = 0));
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  delete from public.library_shares where shared_with = carole;
  perform set_config('request.jwt.claims', json_build_object('sub', carole, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where owner_id = alex; r := r || ('Alex a retiré le partage de Carole: ' || (n = 0));

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
