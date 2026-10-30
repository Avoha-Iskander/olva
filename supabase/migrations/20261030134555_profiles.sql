-- =============================================================================
-- Lot 1.1 — Profils utilisateurs (SPEC §3.1, §7, décision 034)
--
-- Supabase gère les comptes dans auth.users (email, mot de passe, Google…).
-- La table profiles complète chaque compte avec les réglages propres à Olva.
-- Un profil est créé automatiquement à l'inscription (déclencheur plus bas).
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  default_servings integer not null default 4 check (default_servings between 1 and 20),
  -- Passe à vrai à la fin du parcours d'accueil (nom + portions renseignés)
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Réglages Olva de chaque utilisateur (1 ligne par compte).';

-- -----------------------------------------------------------------------------
-- Règles d'accès : je ne vois et ne modifie que MON profil.
-- (Le lot 2 ajoutera la lecture du nom affiché des personnes qui me partagent quelque chose.)
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "Voir son profil"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Modifier son profil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Pas de policy insert/delete : la création est automatique, la suppression
-- suit celle du compte (on delete cascade).
revoke all on public.profiles from anon;
revoke insert, delete, update on public.profiles from authenticated;
grant update (display_name, default_servings, onboarded) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- Nom fourni par Google si disponible, sinon vide (demandé au parcours d'accueil)
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60)
  );
  return new;
end;
$$;

-- Fonction réservée au déclencheur : personne ne peut l'appeler via l'API
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Mise à jour automatique de updated_at
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
