-- =============================================================================
-- Partage des menus, en co-édition (US-MEN-06, décision 077 — révise la 068)
--
-- Comme les listes :
--   - menu_shares       : un menu partagé avec une personne (co-édition)
--   - auto_menu_shares  : mes nouveaux menus partagés automatiquement
-- La personne peut renommer le menu, ajouter ou retirer des recettes, changer les
-- portions et créer SA liste depuis le menu. Seul le créateur supprime le menu,
-- le partage ou retire un partage ; la personne peut y renoncer.
--
-- Un menu partagé rend ses recettes LISIBLES par ceux qui peuvent le modifier
-- (sinon on verrait des recettes sans pouvoir les ouvrir) : on élargit la fonction
-- private.is_shared_with_me, sur laquelle reposent déjà les règles d'accès des
-- recettes, de leurs ingrédients, des articles, des conversions et des photos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tables de partage
-- -----------------------------------------------------------------------------
create table public.menu_shares (
  menu_id uuid not null references public.menus (id) on delete cascade,
  shared_with uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (menu_id, shared_with)
);
create index menu_shares_shared_with_idx on public.menu_shares (shared_with);
comment on table public.menu_shares is 'Un menu partagé en co-édition avec une personne.';

create table public.auto_menu_shares (
  owner_id uuid not null references auth.users (id) on delete cascade,
  shared_with uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, shared_with),
  check (owner_id <> shared_with)
);
create index auto_menu_shares_shared_with_idx on public.auto_menu_shares (shared_with);
comment on table public.auto_menu_shares is 'Mes nouveaux menus sont partagés automatiquement avec ces personnes.';

comment on table public.menus is 'Menus de la semaine (recettes + portions, sans jours) ; partageables en co-édition (décision 077).';

-- -----------------------------------------------------------------------------
-- 2. Fonctions d'aide (security definer : lisent les tables sans repasser par les
--    règles d'accès, ce qui évite les boucles entre règles)
-- -----------------------------------------------------------------------------

-- Puis-je modifier ce menu ? (le mien, ou partagé avec moi)
create or replace function private.can_edit_menu(target_menu uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.menus m
    where m.id = target_menu and m.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.menu_shares s
    where s.menu_id = target_menu and s.shared_with = (select auth.uid())
  );
$$;
revoke all on function private.can_edit_menu(uuid) from public, anon;
grant execute on function private.can_edit_menu(uuid) to authenticated;

-- Recette partagée avec moi DIRECTEMENT (seule ou via la bibliothèque) : l'ancienne
-- définition de is_shared_with_me, gardée telle quelle
create or replace function private.is_shared_directly(target_recipe uuid, target_owner uuid)
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
revoke all on function private.is_shared_directly(uuid, uuid) from public, anon;
grant execute on function private.is_shared_directly(uuid, uuid) to authenticated;

-- Recette lisible par partage : directement, ou parce qu'elle est dans un menu que je
-- peux modifier (le mien ou partagé avec moi)
create or replace function private.is_shared_with_me(target_recipe uuid, target_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_shared_directly(target_recipe, target_owner)
    or exists (
      select 1 from public.menu_recipes mr
      where mr.recipe_id = target_recipe and private.can_edit_menu(mr.menu_id)
    );
$$;

-- Ajouter une recette à un menu : seulement une recette que je peux lire SANS passer
-- par un menu (sinon on pourrait « s'ouvrir » la recette privée de quelqu'un)
create or replace function private.can_add_recipe_to_menu(target_recipe uuid)
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
        or (not r.is_example and private.is_shared_directly(r.id, r.owner_id))
      )
  );
$$;
revoke all on function private.can_add_recipe_to_menu(uuid) from public, anon;
grant execute on function private.can_add_recipe_to_menu(uuid) to authenticated;

-- Les personnes avec qui je partage un menu font aussi partie de mes « contacts »
-- (nom affiché : « Partagé par … », Mes partages)
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
  ) or exists (
    select 1 from public.list_shares s
    join public.shopping_lists l on l.id = s.list_id
    where (l.owner_id = (select auth.uid()) and s.shared_with = target_user)
       or (l.owner_id = target_user and s.shared_with = (select auth.uid()))
  ) or exists (
    select 1 from public.auto_list_shares a
    where (a.owner_id = (select auth.uid()) and a.shared_with = target_user)
       or (a.owner_id = target_user and a.shared_with = (select auth.uid()))
  ) or exists (
    select 1 from public.menu_shares s
    join public.menus m on m.id = s.menu_id
    where (m.owner_id = (select auth.uid()) and s.shared_with = target_user)
       or (m.owner_id = target_user and s.shared_with = (select auth.uid()))
  ) or exists (
    select 1 from public.auto_menu_shares a
    where (a.owner_id = (select auth.uid()) and a.shared_with = target_user)
       or (a.owner_id = target_user and a.shared_with = (select auth.uid()))
  );
$$;

-- -----------------------------------------------------------------------------
-- 3. Règles d'accès
-- -----------------------------------------------------------------------------
alter table public.menu_shares enable row level security;
alter table public.auto_menu_shares enable row level security;

create policy "Voir les partages de menus qui me concernent" on public.menu_shares
  for select to authenticated
  using ((select private.owns_menu(menu_id)) or shared_with = (select auth.uid()));
create policy "Retirer ou renoncer à un partage de menu" on public.menu_shares
  for delete to authenticated
  using ((select private.owns_menu(menu_id)) or shared_with = (select auth.uid()));

create policy "Voir les partages automatiques de menus qui me concernent" on public.auto_menu_shares
  for select to authenticated
  using (owner_id = (select auth.uid()) or shared_with = (select auth.uid()));
create policy "Retirer ou renoncer à un partage automatique de menus" on public.auto_menu_shares
  for delete to authenticated
  using (owner_id = (select auth.uid()) or shared_with = (select auth.uid()));

-- Les partages se créent seulement par les fonctions ci-dessous (lien, email)
revoke all on public.menu_shares, public.auto_menu_shares from anon;
revoke insert, update on public.menu_shares, public.auto_menu_shares from authenticated;

-- Menus : je vois et je modifie aussi ceux qu'on me partage ; seul le créateur supprime
drop policy "Voir mes menus" on public.menus;
create policy "Voir mes menus et ceux qu'on me partage" on public.menus for select to authenticated
  using (owner_id = (select auth.uid()) or private.can_edit_menu(id));
drop policy "Modifier mes menus" on public.menus;
create policy "Modifier les menus que je peux modifier" on public.menus for update to authenticated
  using (private.can_edit_menu(id)) with check (private.can_edit_menu(id));

drop policy "Voir les recettes de mes menus" on public.menu_recipes;
create policy "Voir les recettes des menus que je peux modifier" on public.menu_recipes
  for select to authenticated
  using (private.can_edit_menu(menu_id));
drop policy "Ajouter des recettes à mes menus" on public.menu_recipes;
create policy "Ajouter des recettes aux menus que je peux modifier" on public.menu_recipes
  for insert to authenticated
  with check (private.can_edit_menu(menu_id) and private.can_add_recipe_to_menu(recipe_id));
drop policy "Modifier les recettes de mes menus" on public.menu_recipes;
create policy "Modifier les recettes des menus que je peux modifier" on public.menu_recipes
  for update to authenticated
  using (private.can_edit_menu(menu_id)) with check (private.can_edit_menu(menu_id));
drop policy "Retirer des recettes de mes menus" on public.menu_recipes;
create policy "Retirer des recettes des menus que je peux modifier" on public.menu_recipes
  for delete to authenticated
  using (private.can_edit_menu(menu_id));

-- Une liste peut venir d'un menu qu'on me partage (elle reste à moi)
create or replace function private.check_list_menu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.menu_id is not null
     and new.menu_id is distinct from (case when tg_op = 'UPDATE' then old.menu_id end)
     and not exists (
       select 1 from public.menus where id = new.menu_id and owner_id = new.owner_id
     )
     and not exists (
       select 1 from public.menu_shares
       where menu_id = new.menu_id and shared_with = new.owner_id
     ) then
    raise exception 'Ce menu n''est ni au créateur de la liste, ni partagé avec lui';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Partage automatique : appliqué à la création d'un menu (nouveau ou dupliqué)
-- -----------------------------------------------------------------------------
create or replace function private.apply_auto_menu_shares()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.menu_shares (menu_id, shared_with)
  select new.id, a.shared_with
  from public.auto_menu_shares a
  where a.owner_id = new.owner_id
  on conflict do nothing;
  return new;
end;
$$;

create trigger menus_apply_auto_shares
  after insert on public.menus
  for each row execute function private.apply_auto_menu_shares();

-- -----------------------------------------------------------------------------
-- 5. Liens de partage : un menu, mes nouveaux menus ; « tout » inclut les menus
-- -----------------------------------------------------------------------------
alter table public.share_links add column menu_id uuid references public.menus (id) on delete cascade;
create index share_links_menu_id_idx on public.share_links (menu_id);
grant insert (menu_id) on public.share_links to authenticated;

alter table public.share_links drop constraint share_links_kind_check;
alter table public.share_links add constraint share_links_kind_check
  check (kind in ('recipe', 'library', 'list', 'auto_lists', 'menu', 'auto_menus', 'everything'));
alter table public.share_links drop constraint share_links_target_check;
alter table public.share_links add constraint share_links_target_check
  check (
    (kind = 'recipe') = (recipe_id is not null)
    and (kind = 'list') = (list_id is not null)
    and (kind = 'menu') = (menu_id is not null)
  );

drop policy "Créer mes liens de partage" on public.share_links;
create policy "Créer mes liens de partage" on public.share_links for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (
      kind in ('library', 'auto_lists', 'auto_menus', 'everything')
      or (kind = 'recipe' and exists (
        select 1 from public.recipes r
        where r.id = recipe_id and r.owner_id = (select auth.uid()) and not r.is_example
      ))
      or (kind = 'list' and exists (
        select 1 from public.shopping_lists l
        where l.id = list_id and l.owner_id = (select auth.uid()) and l.status <> 'draft'
      ))
      or (kind = 'menu' and exists (
        select 1 from public.menus m
        where m.id = menu_id and m.owner_id = (select auth.uid())
      ))
    )
  );

-- Aperçu d'un lien : ajoute le nom du menu (le type de retour change : on la recrée)
drop function public.preview_share_link(text);
create function public.preview_share_link(token text)
returns table (
  status text, kind text, owner_name text, recipe_title text, list_created_at timestamptz, menu_name text
)
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
    return query select 'invalid'::text, null::text, null::text, null::text, null::timestamptz, null::text;
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
    (select r.title from public.recipes r where r.id = link.recipe_id),
    (select l.created_at from public.shopping_lists l where l.id = link.list_id),
    (select m.name from public.menus m where m.id = link.menu_id);
end;
$$;
revoke all on function public.preview_share_link(text) from public, anon;
grant execute on function public.preview_share_link(text) to authenticated;

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

  select * into link from public.share_links where token_hash = private.hash_token(token) for update;
  if link.id is null then return 'invalid'; end if;
  if link.owner_id = current_user_id then return 'own'; end if;
  if link.used_at is not null then
    return case when link.used_by = current_user_id then 'accepted' else 'used' end;
  end if;
  if link.expires_at < now() then return 'expired'; end if;

  if link.kind = 'recipe' then
    insert into public.recipe_shares (recipe_id, shared_with) values (link.recipe_id, current_user_id)
    on conflict do nothing;
  elsif link.kind = 'library' then
    insert into public.library_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
  elsif link.kind = 'list' then
    insert into public.list_shares (list_id, shared_with) values (link.list_id, current_user_id)
    on conflict do nothing;
  elsif link.kind = 'auto_lists' then
    insert into public.auto_list_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
  elsif link.kind = 'menu' then
    insert into public.menu_shares (menu_id, shared_with) values (link.menu_id, current_user_id)
    on conflict do nothing;
  elsif link.kind = 'auto_menus' then
    insert into public.auto_menu_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
  else -- everything : recettes, nouvelles listes et nouveaux menus
    insert into public.library_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
    insert into public.auto_list_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
    insert into public.auto_menu_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
  end if;

  update public.share_links set used_at = now(), used_by = current_user_id where id = link.id;
  return 'accepted';
end;
$$;
revoke all on function public.accept_share_link(text) from public, anon;
grant execute on function public.accept_share_link(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Partager un menu (ou mes futurs menus) par email
-- kind : 'menu' (target_menu obligatoire) ou 'auto_menus'.
-- Renvoie 'shared', 'already', 'no_account' ou 'self' (comme share_list_by_email).
-- -----------------------------------------------------------------------------
create or replace function public.share_menu_by_email(kind text, target_menu uuid, target_email text)
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
  if kind not in ('menu', 'auto_menus') then
    raise exception 'Type de partage inconnu';
  end if;
  if kind = 'menu' and not exists (
    select 1 from public.menus m where m.id = target_menu and m.owner_id = current_user_id
  ) then
    raise exception 'Menu introuvable';
  end if;

  select u.id into recipient
  from auth.users u
  where lower(u.email) = lower(trim(target_email)) and u.email_confirmed_at is not null;
  if recipient is null then return 'no_account'; end if;
  if recipient = current_user_id then return 'self'; end if;

  if kind = 'menu' then
    insert into public.menu_shares (menu_id, shared_with) values (target_menu, recipient)
    on conflict do nothing;
  else
    insert into public.auto_menu_shares (owner_id, shared_with) values (current_user_id, recipient)
    on conflict do nothing;
  end if;
  return case when found then 'shared' else 'already' end;
end;
$$;
revoke all on function public.share_menu_by_email(text, uuid, text) from public, anon;
grant execute on function public.share_menu_by_email(text, uuid, text) to authenticated;
