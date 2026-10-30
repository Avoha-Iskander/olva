-- =============================================================================
-- Lot 1.5 — Suppression de son propre compte (US-CPT-04)
--
-- Supprime le compte de l'utilisateur connecté, et seulement le sien.
-- Toutes ses données suivent automatiquement (clés étrangères « on delete cascade »).
-- Évite de stocker la clé de service Supabase (toute-puissante) côté application.
-- =============================================================================

create or replace function public.delete_own_account()
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

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
