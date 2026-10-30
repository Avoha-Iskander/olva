-- =============================================================================
-- Correctif — comptes sans profil
--
-- Un compte créé AVANT la migration « profiles » n'a pas de profil (le déclencheur
-- n'existait pas encore), ce qui faisait boucler l'application.
-- 1. Rattrapage : crée un profil pour chaque compte qui n'en a pas.
-- 2. Filet de sécurité : fonction ensure_my_profile(), appelée par l'application
--    si jamais un profil manque, qui le crée pour l'utilisateur connecté.
-- =============================================================================

insert into public.profiles (id, display_name)
select
  u.id,
  left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), 60)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  insert into public.profiles (id, display_name)
  select
    u.id,
    left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), 60)
  from auth.users u
  where u.id = current_user_id
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
