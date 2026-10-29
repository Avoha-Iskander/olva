-- Test des règles d'accès du foyer (lot 1.1)
--
-- À exécuter sur olva-dev UNIQUEMENT : Supabase → SQL Editor → coller → Run.
-- Le test crée 3 utilisateurs fictifs (Alex, Camille, Zoé), vérifie qui voit
-- et modifie quoi, puis ANNULE TOUT : il se termine volontairement par une
-- « erreur » qui contient les résultats. Rien n'est conservé en base.
-- Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  camille uuid := '00000000-0000-0000-0000-00000000000c';
  zoe uuid := '00000000-0000-0000-0000-00000000000e';
  hh_alex uuid; tok uuid; old_tok uuid; n int; t text; ok boolean;
begin
  insert into auth.users (id, email, aud, role) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated'),
    (camille, 'camille@test.local', 'authenticated', 'authenticated'),
    (zoe, 'zoe@test.local', 'authenticated', 'authenticated');

  perform set_config('role', 'authenticated', true);

  -- Alex crée son foyer et une invitation
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  hh_alex := public.create_household('Foyer Alex', 4);
  select count(*) into n from public.households; r := r || ('Alex voit son foyer: ' || (n = 1));
  select role = 'owner' into ok from public.household_members where user_id = alex; r := r || ('Alex est propriétaire: ' || ok);
  insert into public.invitations (household_id) values (hh_alex) returning token into tok;
  select count(*) into n from public.invitations; r := r || ('Alex voit son invitation: ' || (n = 1));
  begin perform public.create_household('Doublon', 2); r := r || 'Pas de 2e foyer: false'::text;
  exception when others then r := r || 'Pas de 2e foyer: true'::text; end;

  -- Zoé, dans un autre foyer, ne voit rien de celui d'Alex
  perform set_config('request.jwt.claims', json_build_object('sub', zoe, 'role', 'authenticated')::text, true);
  perform public.create_household('Foyer Zoé', 2);
  select count(*) into n from public.households; r := r || ('Zoé ne voit que son foyer: ' || (n = 1));
  select count(*) into n from public.household_members; r := r || ('Zoé ne voit pas les membres d''Alex: ' || (n = 1));
  select count(*) into n from public.invitations; r := r || ('Zoé ne voit pas les invitations d''Alex: ' || (n = 0));
  update public.households set name = 'Piraté' where id = hh_alex;
  begin insert into public.invitations (household_id) values (hh_alex); r := r || 'Zoé ne peut pas inviter chez Alex: false'::text;
  exception when others then r := r || 'Zoé ne peut pas inviter chez Alex: true'::text; end;

  -- Camille rejoint le foyer d'Alex avec le lien
  perform set_config('request.jwt.claims', json_build_object('sub', camille, 'role', 'authenticated')::text, true);
  select household_name into t from public.get_invitation(tok); r := r || ('Camille voit le nom du foyer: ' || (t = 'Foyer Alex'));
  perform public.accept_invitation(tok);
  select count(*) into n from public.household_members; r := r || ('Camille voit les 2 membres: ' || (n = 2));
  select count(*) into n from public.invitations; r := r || ('Camille (membre) ne voit pas les invitations: ' || (n = 0));
  update public.households set name = 'Renommé par Camille';
  begin perform public.accept_invitation(tok); r := r || 'Lien à usage unique: false'::text;
  exception when others then r := r || 'Lien à usage unique: true'::text; end;

  -- Alex vérifie que personne d'autre n'a renommé le foyer
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  select name into t from public.households; r := r || ('Ni Zoé ni Camille n''ont renommé: ' || (t = 'Foyer Alex'));
  update public.households set name = 'Famille Alex';
  select name into t from public.households; r := r || ('Alex peut renommer: ' || (t = 'Famille Alex'));
  insert into public.invitations (household_id, expires_at) values (hh_alex, now() - interval '1 minute') returning token into old_tok;

  perform set_config('request.jwt.claims', json_build_object('sub', zoe, 'role', 'authenticated')::text, true);
  select count(*) into n from public.get_invitation(old_tok); r := r || ('Lien expiré refusé: ' || (n = 0));

  -- Départs et exclusions
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  delete from public.household_members where user_id = alex;
  select count(*) into n from public.household_members; r := r || ('Le propriétaire ne peut pas quitter: ' || (n = 2));
  delete from public.household_members where user_id = camille;
  select count(*) into n from public.household_members; r := r || ('Alex peut exclure Camille: ' || (n = 1));

  -- Visiteur non connecté
  perform set_config('role', 'anon', true);
  begin perform count(*) from public.households; r := r || 'Visiteur bloqué: false'::text;
  exception when others then r := r || 'Visiteur bloqué: true'::text; end;

  -- Annule tout en affichant les résultats
  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
