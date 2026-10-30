-- Test des règles d'accès des profils (lot 1.1)
--
-- À exécuter sur olva-dev UNIQUEMENT : Supabase → SQL Editor → coller → Run.
-- Crée 2 utilisateurs fictifs, vérifie qui voit et modifie quoi, puis ANNULE TOUT :
-- le script se termine volontairement par une « erreur » qui affiche les résultats.
-- Rien n'est conservé en base. Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  zoe uuid := '00000000-0000-0000-0000-00000000000e';
  n int; t text;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated', '{"full_name":"Alex Test"}'),
    (zoe, 'zoe@test.local', 'authenticated', 'authenticated', '{}');

  select count(*) into n from public.profiles where id in (alex, zoe);
  r := r || ('Profils créés automatiquement: ' || (n = 2));
  select display_name into t from public.profiles where id = alex;
  r := r || ('Nom repris de Google: ' || (t = 'Alex Test'));

  perform set_config('role', 'authenticated', true);

  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  select count(*) into n from public.profiles; r := r || ('Alex ne voit que son profil: ' || (n = 1));
  update public.profiles set default_servings = 6 where id = alex;
  update public.profiles set display_name = 'Piraté' where id = zoe;
  begin update public.profiles set created_at = now() - interval '1 year' where id = alex; r := r || 'Colonnes protégées: false'::text;
  exception when others then r := r || 'Colonnes protégées: true'::text; end;
  begin insert into public.profiles (id) values (gen_random_uuid()); r := r || 'Création manuelle interdite: false'::text;
  exception when others then r := r || 'Création manuelle interdite: true'::text; end;

  perform set_config('request.jwt.claims', json_build_object('sub', zoe, 'role', 'authenticated')::text, true);
  select display_name into t from public.profiles; r := r || ('Alex n''a pas pu modifier Zoé: ' || (t = ''));

  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  select default_servings into n from public.profiles; r := r || ('Alex peut modifier ses portions: ' || (n = 6));

  perform set_config('role', 'anon', true);
  begin perform count(*) from public.profiles; r := r || 'Visiteur bloqué: false'::text;
  exception when others then r := r || 'Visiteur bloqué: true'::text; end;

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
