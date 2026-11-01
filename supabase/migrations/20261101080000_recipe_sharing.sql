-- =============================================================================
-- Lot 2.7 — Partage des recettes (US-REC-05, US-CPT-03 ; décisions 034, 039)
--
-- On partage EN LECTURE :
--   - une recette avec une personne       → recipe_shares
--   - toute sa bibliothèque (y compris les recettes futures) → library_shares
-- Par email (compte Olva existant) ou par lien à usage unique valable 7 jours
-- (share_links). Les recettes d'exemple ne se partagent jamais.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.recipe_shares (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  shared_with uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, shared_with)
);
create index recipe_shares_shared_with_idx on public.recipe_shares (shared_with);
comment on table public.recipe_shares is 'Une recette partagée en lecture avec une personne.';

create table public.library_shares (
  owner_id uuid not null references auth.users (id) on delete cascade,
  shared_with uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, shared_with),
  check (owner_id <> shared_with)
);
create index library_shares_shared_with_idx on public.library_shares (shared_with);
comment on table public.library_shares is 'Toutes les recettes d''une personne, partagées en lecture (y compris les futures).';

-- Le lien n'est jamais stocké : seulement son empreinte SHA-256 (token_hash).
-- Quelqu'un qui lirait la base ne pourrait donc pas utiliser les liens.
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('recipe', 'library')), -- les listes s'ajouteront au lot 4
  recipe_id uuid references public.recipes (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Un lien « recette » vise une recette ; un lien « bibliothèque », aucune
  check ((kind = 'recipe') = (recipe_id is not null))
);
create index share_links_owner_id_idx on public.share_links (owner_id);
create index share_links_recipe_id_idx on public.share_links (recipe_id);
create index share_links_used_by_idx on public.share_links (used_by);
comment on table public.share_links is 'Liens de partage à usage unique (7 jours) ; seule l''empreinte du lien est stockée.';

-- -----------------------------------------------------------------------------
-- Fonctions d'aide aux règles d'accès (security definer : elles lisent les
-- tables sans repasser par les règles, ce qui évite les boucles entre règles)
-- -----------------------------------------------------------------------------

-- Cette recette (d'un autre) m'est-elle partagée, seule ou via sa bibliothèque ?
create or replace function private.is_shared_with_me(target_recipe uuid, target_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipe_shares s
    where s.recipe_id = target_recipe and s.shared_with = (select auth.uid())
  ) or exists (
    select 1 from public.library_shares l
    where l.owner_id = target_owner and l.shared_with = (select auth.uid())
  );
$$;

-- Puis-je lire cette recette ? (la mienne, ou partagée avec moi et pas un exemple)
create or replace function private.can_read_recipe(target_recipe uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = target_recipe
      and (
        r.owner_id = (select auth.uid())
        or (not r.is_example and private.is_shared_with_me(r.id, r.owner_id))
      )
  );
$$;

-- Cet article personnel (d'un autre) sert-il dans une recette qu'on me partage ?
create or replace function private.item_in_shared_recipe(target_item uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.recipe_ingredients ri
    join public.recipes r on r.id = ri.recipe_id
    where ri.item_id = target_item
      and not r.is_example
      and private.is_shared_with_me(r.id, r.owner_id)
  );
$$;

-- Photo : chemin <propriétaire>/<recette>/<fichier> ; lisible si la recette l'est
create or replace function private.can_read_recipe_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder text := (storage.foldername(object_name))[2];
begin
  -- Un dossier qui n'est pas un identifiant de recette ne donne accès à rien
  if folder is null or folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.can_read_recipe(folder::uuid);
end;
$$;

-- Cette personne et moi partageons-nous quelque chose (dans un sens ou dans l'autre) ?
create or replace function private.is_share_contact(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.library_shares l
    where (l.owner_id = (select auth.uid()) and l.shared_with = target_user)
       or (l.owner_id = target_user and l.shared_with = (select auth.uid()))
  ) or exists (
    select 1 from public.recipe_shares s
    join public.recipes r on r.id = s.recipe_id
    where (r.owner_id = (select auth.uid()) and s.shared_with = target_user)
       or (r.owner_id = target_user and s.shared_with = (select auth.uid()))
  );
$$;

revoke all on function private.is_shared_with_me(uuid, uuid) from public, anon;
revoke all on function private.can_read_recipe(uuid) from public, anon;
revoke all on function private.item_in_shared_recipe(uuid) from public, anon;
revoke all on function private.can_read_recipe_photo(text) from public, anon;
revoke all on function private.is_share_contact(uuid) from public, anon;
grant execute on function private.is_shared_with_me(uuid, uuid) to authenticated;
grant execute on function private.can_read_recipe(uuid) to authenticated;
grant execute on function private.item_in_shared_recipe(uuid) to authenticated;
grant execute on function private.can_read_recipe_photo(text) to authenticated;
grant execute on function private.is_share_contact(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Règles d'accès élargies : je vois aussi ce qu'on me partage (en lecture)
-- -----------------------------------------------------------------------------
drop policy "Voir mes recettes" on public.recipes;
create policy "Voir mes recettes et celles qu'on me partage" on public.recipes for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (not is_example and private.is_shared_with_me(id, owner_id))
  );

drop policy "Voir les ingrédients de mes recettes" on public.recipe_ingredients;
create policy "Voir les ingrédients des recettes que je peux lire" on public.recipe_ingredients
  for select to authenticated
  using (private.can_read_recipe(recipe_id));

drop policy "Voir le catalogue commun et mes articles" on public.items;
create policy "Voir le catalogue commun, mes articles et ceux des recettes partagées" on public.items
  for select to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
    or private.item_in_shared_recipe(id)
  );

-- Conversions des articles des recettes partagées (utiles à la copie, lot 2.8)
drop policy "Voir les conversions communes et les miennes" on public.unit_conversions;
create policy "Voir les conversions communes, les miennes et celles des recettes partagées"
  on public.unit_conversions for select to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
    or private.item_in_shared_recipe(item_id)
  );

create policy "Voir les photos des recettes qu'on me partage" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-photos' and private.can_read_recipe_photo(name));

-- Nom affiché des personnes avec qui je partage (« Partagé par … », « Mes partages »)
create policy "Voir le profil des personnes avec qui je partage" on public.profiles for select to authenticated
  using (private.is_share_contact(id));

-- Partages : visibles par les deux personnes ; retirés par celui qui partage,
-- ou abandonnés par celui qui reçoit. Création uniquement par les fonctions plus bas.
alter table public.recipe_shares enable row level security;
alter table public.library_shares enable row level security;
alter table public.share_links enable row level security;

create policy "Voir les partages de recettes qui me concernent" on public.recipe_shares for select to authenticated
  using (shared_with = (select auth.uid()) or (select private.owns_recipe(recipe_id)));
create policy "Retirer ou renoncer à un partage de recette" on public.recipe_shares for delete to authenticated
  using (shared_with = (select auth.uid()) or (select private.owns_recipe(recipe_id)));

create policy "Voir les partages de bibliothèque qui me concernent" on public.library_shares for select to authenticated
  using (owner_id = (select auth.uid()) or shared_with = (select auth.uid()));
create policy "Retirer ou renoncer à un partage de bibliothèque" on public.library_shares for delete to authenticated
  using (owner_id = (select auth.uid()) or shared_with = (select auth.uid()));

-- Liens : je ne vois, crée et annule que les miens ; jamais pour une recette d'exemple
create policy "Voir mes liens de partage" on public.share_links for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Créer mes liens de partage" on public.share_links for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (
      kind = 'library'
      or exists (
        select 1 from public.recipes r
        where r.id = recipe_id and r.owner_id = (select auth.uid()) and not r.is_example
      )
    )
  );
create policy "Annuler mes liens de partage" on public.share_links for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.recipe_shares, public.library_shares, public.share_links from anon;
revoke insert, update on public.recipe_shares, public.library_shares from authenticated;
-- Pour un lien, l'application ne choisit que son type, sa recette et son empreinte
-- (pas la date d'expiration, ni « utilisé »)
revoke insert, update on public.share_links from authenticated;
grant insert (kind, recipe_id, token_hash) on public.share_links to authenticated;

-- -----------------------------------------------------------------------------
-- Partager par email avec un compte Olva existant.
-- Renvoie : 'shared' (fait), 'already' (déjà partagé), 'no_account', 'self'.
-- security definer : il faut lire auth.users pour retrouver le compte.
-- -----------------------------------------------------------------------------
create or replace function public.share_by_email(kind text, target_recipe uuid, target_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  recipient uuid;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;
  if kind not in ('recipe', 'library') then
    raise exception 'Type de partage inconnu';
  end if;
  if kind = 'recipe' and not exists (
    select 1 from public.recipes r
    where r.id = target_recipe and r.owner_id = current_user_id and not r.is_example
  ) then
    raise exception 'Recette introuvable ou non partageable';
  end if;

  select u.id into recipient
  from auth.users u
  where lower(u.email) = lower(trim(target_email)) and u.email_confirmed_at is not null;

  if recipient is null then
    return 'no_account';
  end if;
  if recipient = current_user_id then
    return 'self';
  end if;

  if kind = 'recipe' then
    insert into public.recipe_shares (recipe_id, shared_with)
    values (target_recipe, recipient)
    on conflict do nothing;
  else
    insert into public.library_shares (owner_id, shared_with)
    values (current_user_id, recipient)
    on conflict do nothing;
  end if;

  -- found : vrai si la dernière commande a écrit une ligne
  return case when found then 'shared' else 'already' end;
end;
$$;

-- -----------------------------------------------------------------------------
-- Liens : l'empreinte est calculée de la même façon côté application (SHA-256, hexadécimal)
-- -----------------------------------------------------------------------------
create or replace function private.hash_token(token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;

-- Ce que contient un lien, avant de l'accepter.
-- status : 'valid', 'invalid', 'used', 'expired', 'own', 'accepted' (déjà accepté par moi)
create or replace function public.preview_share_link(token text)
returns table (status text, kind text, owner_name text, recipe_title text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  link public.share_links;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select * into link from public.share_links where token_hash = private.hash_token(token);
  if link.id is null then
    return query select 'invalid'::text, null::text, null::text, null::text;
    return;
  end if;

  return query
  select
    case
      when link.owner_id = current_user_id then 'own'
      when link.used_at is not null and link.used_by = current_user_id then 'accepted'
      when link.used_at is not null then 'used'
      when link.expires_at < now() then 'expired'
      else 'valid'
    end,
    link.kind,
    (select p.display_name from public.profiles p where p.id = link.owner_id),
    (select r.title from public.recipes r where r.id = link.recipe_id);
end;
$$;

-- Accepter un lien : crée le partage et marque le lien comme utilisé.
-- Renvoie le même statut que preview_share_link ('accepted' en cas de succès).
create or replace function public.accept_share_link(token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  link public.share_links;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  -- « for update » verrouille la ligne : deux clics simultanés ne peuvent pas utiliser le lien deux fois
  select * into link from public.share_links where token_hash = private.hash_token(token) for update;
  if link.id is null then return 'invalid'; end if;
  if link.owner_id = current_user_id then return 'own'; end if;
  if link.used_at is not null then
    return case when link.used_by = current_user_id then 'accepted' else 'used' end;
  end if;
  if link.expires_at < now() then return 'expired'; end if;

  if link.kind = 'recipe' then
    insert into public.recipe_shares (recipe_id, shared_with)
    values (link.recipe_id, current_user_id)
    on conflict do nothing;
  else
    insert into public.library_shares (owner_id, shared_with)
    values (link.owner_id, current_user_id)
    on conflict do nothing;
  end if;

  update public.share_links set used_at = now(), used_by = current_user_id where id = link.id;
  return 'accepted';
end;
$$;

revoke all on function private.hash_token(text) from public, anon;
grant execute on function private.hash_token(text) to authenticated;
revoke all on function public.share_by_email(text, uuid, text) from public, anon;
revoke all on function public.preview_share_link(text) from public, anon;
revoke all on function public.accept_share_link(text) from public, anon;
grant execute on function public.share_by_email(text, uuid, text) to authenticated;
grant execute on function public.preview_share_link(text) to authenticated;
grant execute on function public.accept_share_link(text) to authenticated;
