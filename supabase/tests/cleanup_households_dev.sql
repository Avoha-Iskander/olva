-- Nettoyage ponctuel d'olva-dev (à exécuter une seule fois, puis ce fichier pourra être supprimé)
-- Retire la migration « foyers » appliquée le 29/10 puis abandonnée (décision 034).
-- Supabase → SQL Editor du projet olva-dev → coller → Run.

drop function if exists public.accept_invitation(uuid);
drop function if exists public.get_invitation(uuid);
drop function if exists public.create_household(text, integer);
drop table if exists public.invitations;
drop table if exists public.household_members;
drop table if exists public.households;
drop function if exists private.is_household_owner(uuid);
drop function if exists private.current_household_id();
drop schema if exists private;
delete from supabase_migrations.schema_migrations where version = '20261029055130';
