-- =============================================================================
-- Lot 1.1 — Foyers, membres et invitations (SPEC §3.1, §7)
--
-- Principe : chaque utilisateur appartient à UN foyer. Toutes les données
-- (recettes, listes…) seront rattachées à un foyer, et les règles d'accès (RLS)
-- garantissent qu'un utilisateur ne voit que celles de son foyer.
-- =============================================================================

-- Schéma « private » : fonctions internes, invisibles depuis l'API publique.
create schema if not exists private;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  default_servings integer not null default 4 check (default_servings between 1 and 20),
  created_at timestamptz not null default now()
);
comment on table public.households is 'Foyer : groupe d''utilisateurs qui partagent recettes, catalogue et listes.';

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- Un utilisateur n'appartient qu'à un seul foyer
  constraint household_members_one_household_per_user unique (user_id)
);
comment on table public.household_members is 'Membres d''un foyer et leur rôle (owner = propriétaire).';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- Le jeton est la partie secrète du lien d'invitation
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null
);
comment on table public.invitations is 'Liens d''invitation : usage unique, valables 7 jours.';

create index invitations_household_id_idx on public.invitations (household_id);
create index invitations_created_by_idx on public.invitations (created_by);
create index invitations_used_by_idx on public.invitations (used_by);

-- -----------------------------------------------------------------------------
-- Fonctions d'aide pour les règles d'accès
-- « security definer » : elles lisent household_members sans repasser par les
-- règles d'accès (sinon une règle qui interroge sa propre table tourne en rond).
-- -----------------------------------------------------------------------------

-- Foyer de l'utilisateur connecté (null s'il n'en a pas)
create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id
  from public.household_members
  where user_id = (select auth.uid());
$$;

-- L'utilisateur connecté est-il propriétaire de ce foyer ?
create or replace function private.is_household_owner(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

revoke all on function private.current_household_id() from public, anon;
revoke all on function private.is_household_owner(uuid) from public, anon;
grant execute on function private.current_household_id() to authenticated;
grant execute on function private.is_household_owner(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Règles d'accès (Row Level Security)
-- Activer RLS = tout est interdit par défaut ; chaque « policy » ouvre un droit précis.
-- -----------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.invitations enable row level security;

-- Foyers : je vois mon foyer ; seul le propriétaire le modifie ou le supprime.
-- (La création passe par la fonction create_household, plus bas.)
create policy "Voir son foyer"
  on public.households for select
  to authenticated
  using (id = (select private.current_household_id()));

create policy "Le propriétaire modifie le foyer"
  on public.households for update
  to authenticated
  using ((select private.is_household_owner(id)))
  with check ((select private.is_household_owner(id)));

create policy "Le propriétaire supprime le foyer"
  on public.households for delete
  to authenticated
  using ((select private.is_household_owner(id)));

-- Membres : je vois les membres de mon foyer.
-- Le propriétaire peut exclure un membre ; un membre peut quitter le foyer.
-- (L'ajout passe par create_household / accept_invitation.)
create policy "Voir les membres de son foyer"
  on public.household_members for select
  to authenticated
  using (household_id = (select private.current_household_id()));

create policy "Exclure un membre ou quitter le foyer"
  on public.household_members for delete
  to authenticated
  using (
    (role = 'member' and (select private.is_household_owner(household_id)))
    or (user_id = (select auth.uid()) and role = 'member')
  );

-- Invitations : réservées au propriétaire du foyer.
create policy "Le propriétaire voit les invitations"
  on public.invitations for select
  to authenticated
  using ((select private.is_household_owner(household_id)));

create policy "Le propriétaire crée une invitation"
  on public.invitations for insert
  to authenticated
  with check (
    (select private.is_household_owner(household_id))
    and created_by = (select auth.uid())
    and used_at is null
    and used_by is null
    and expires_at <= now() + interval '7 days'
  );

create policy "Le propriétaire supprime une invitation"
  on public.invitations for delete
  to authenticated
  using ((select private.is_household_owner(household_id)));

-- Droits sur les colonnes : le propriétaire ne peut modifier que le nom et les portions
revoke update on public.households from authenticated;
grant update (name, default_servings) on public.households to authenticated;

-- -----------------------------------------------------------------------------
-- Fonctions appelées par l'app (RPC)
-- -----------------------------------------------------------------------------

-- Crée un foyer et en fait l'utilisateur connecté propriétaire, en une seule opération.
create or replace function public.create_household(household_name text, servings integer default 4)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Utilisateur non connecté';
  end if;
  if exists (select 1 from public.household_members where user_id = (select auth.uid())) then
    raise exception 'Vous appartenez déjà à un foyer';
  end if;

  insert into public.households (name, default_servings)
  values (trim(household_name), servings)
  returning id into new_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_id, (select auth.uid()), 'owner');

  return new_id;
end;
$$;

-- Affiche le nom du foyer avant d'accepter (« Rejoindre le foyer Dupont ? »).
-- Ne renvoie rien si le lien est invalide, expiré ou déjà utilisé.
create or replace function public.get_invitation(invitation_token uuid)
returns table (household_name text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select h.name, i.expires_at
  from public.invitations i
  join public.households h on h.id = i.household_id
  where i.token = invitation_token
    and i.used_at is null
    and i.expires_at > now();
$$;

-- Accepte une invitation : ajoute l'utilisateur au foyer et « consomme » le lien.
create or replace function public.accept_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitations%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Utilisateur non connecté';
  end if;

  -- « for update » verrouille la ligne : deux personnes ne peuvent pas utiliser le même lien en même temps
  select * into inv
  from public.invitations
  where token = invitation_token
  for update;

  if not found or inv.used_at is not null or inv.expires_at <= now() then
    raise exception 'Invitation invalide, expirée ou déjà utilisée';
  end if;
  if exists (select 1 from public.household_members where user_id = (select auth.uid())) then
    raise exception 'Vous appartenez déjà à un foyer';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (inv.household_id, (select auth.uid()), 'member');

  update public.invitations
  set used_at = now(), used_by = (select auth.uid())
  where id = inv.id;

  return inv.household_id;
end;
$$;

revoke all on function public.create_household(text, integer) from public, anon;
revoke all on function public.get_invitation(uuid) from public, anon;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.create_household(text, integer) to authenticated;
grant execute on function public.get_invitation(uuid) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- Les visiteurs non connectés n'ont aucun accès à ces tables
revoke all on public.households, public.household_members, public.invitations from anon;
