-- =============================================================================
-- Lot 4 — Partage des listes en co-édition (US-LST-07 ; décisions 034, 044, 045)
--
-- Une liste PRÊTE se partage par email ou par lien (7 jours, usage unique).
-- La personne peut ajouter, retirer et modifier les articles ; seul le créateur
-- supprime la liste ou retire un partage ; la personne peut renoncer.
-- « Partager automatiquement mes nouvelles listes avec … » : chaque liste
-- terminée est partagée d'office avec ces personnes.
-- =============================================================================

create table public.list_shares (
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  shared_with uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, shared_with)
);
create index list_shares_shared_with_idx on public.list_shares (shared_with);
comment on table public.list_shares is 'Une liste partagée en co-édition avec une personne.';

create table public.auto_list_shares (
  owner_id uuid not null references auth.users (id) on delete cascade,
  shared_with uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, shared_with),
  check (owner_id <> shared_with)
);
create index auto_list_shares_shared_with_idx on public.auto_list_shares (shared_with);
comment on table public.auto_list_shares is 'Mes nouvelles listes sont partagées automatiquement avec ces personnes.';

-- Liens : deux nouveaux types (une liste, mes listes futures)
alter table public.share_links add column list_id uuid references public.shopping_lists (id) on delete cascade;
create index share_links_list_id_idx on public.share_links (list_id);
alter table public.share_links drop constraint share_links_kind_check;
alter table public.share_links drop constraint share_links_check;
alter table public.share_links add constraint share_links_kind_check
  check (kind in ('recipe', 'library', 'list', 'auto_lists'));
alter table public.share_links add constraint share_links_target_check
  check ((kind = 'recipe') = (recipe_id is not null) and (kind = 'list') = (list_id is not null));
grant insert (list_id) on public.share_links to authenticated;

-- -----------------------------------------------------------------------------
-- Fonctions d'aide (security definer : lisent sans repasser par les règles)
-- -----------------------------------------------------------------------------

-- Puis-je modifier le contenu de cette liste ? (la mienne, ou partagée avec moi)
create or replace function private.can_edit_list(target_list uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shopping_lists l
    where l.id = target_list
      and (
        l.owner_id = (select auth.uid())
        or exists (
          select 1 from public.list_shares s
          where s.list_id = l.id and s.shared_with = (select auth.uid())
        )
      )
  );
$$;

-- Cet article (personnel, d'un autre) figure-t-il dans une liste que je peux modifier ?
create or replace function private.item_in_my_lists(target_item uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shopping_list_items sli
    where sli.item_id = target_item and private.can_edit_list(sli.list_id)
  );
$$;

revoke all on function private.can_edit_list(uuid) from public, anon;
revoke all on function private.item_in_my_lists(uuid) from public, anon;
grant execute on function private.can_edit_list(uuid) to authenticated;
grant execute on function private.item_in_my_lists(uuid) to authenticated;

-- Les personnes avec qui je partage une liste font aussi partie de mes « contacts »
-- (nom affiché visible : « Partagé par … », Mes partages)
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
  );
$$;

-- -----------------------------------------------------------------------------
-- Règles d'accès élargies aux listes partagées
-- -----------------------------------------------------------------------------
drop policy "Voir mes listes" on public.shopping_lists;
create policy "Voir mes listes et celles qu'on me partage" on public.shopping_lists for select to authenticated
  using (owner_id = (select auth.uid()) or private.can_edit_list(id));

drop policy "Voir les recettes de mes listes" on public.shopping_list_recipes;
create policy "Voir les recettes des listes que je peux modifier" on public.shopping_list_recipes
  for select to authenticated using (private.can_edit_list(list_id));

drop policy "Voir les lignes de mes listes" on public.shopping_list_items;
drop policy "Ajouter des lignes à mes listes" on public.shopping_list_items;
drop policy "Modifier les lignes de mes listes" on public.shopping_list_items;
drop policy "Supprimer les lignes de mes listes" on public.shopping_list_items;
create policy "Voir les lignes des listes que je peux modifier" on public.shopping_list_items
  for select to authenticated using (private.can_edit_list(list_id));
create policy "Ajouter des lignes aux listes que je peux modifier" on public.shopping_list_items
  for insert to authenticated with check (private.can_edit_list(list_id));
create policy "Modifier les lignes des listes que je peux modifier" on public.shopping_list_items
  for update to authenticated
  using (private.can_edit_list(list_id)) with check (private.can_edit_list(list_id));
create policy "Supprimer les lignes des listes que je peux modifier" on public.shopping_list_items
  for delete to authenticated using (private.can_edit_list(list_id));

-- Articles et conversions : aussi ceux qui figurent dans mes listes (partagées ou non)
drop policy "Voir le catalogue commun, mes articles et ceux des recettes partagées" on public.items;
create policy "Voir le catalogue commun, mes articles et ceux des recettes et listes partagées"
  on public.items for select to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
    or private.item_in_shared_recipe(id)
    or private.item_in_my_lists(id)
  );
drop policy "Voir les conversions communes, les miennes et celles des recettes partagées" on public.unit_conversions;
create policy "Voir les conversions communes, les miennes et celles des recettes et listes partagées"
  on public.unit_conversions for select to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
    or private.item_in_shared_recipe(item_id)
    or private.item_in_my_lists(item_id)
  );

-- Partages de listes : visibles par les deux ; retirés par le créateur ou abandonnés
alter table public.list_shares enable row level security;
alter table public.auto_list_shares enable row level security;

create policy "Voir les partages de listes qui me concernent" on public.list_shares for select to authenticated
  using (shared_with = (select auth.uid()) or (select private.owns_list(list_id)));
create policy "Retirer ou renoncer à un partage de liste" on public.list_shares for delete to authenticated
  using (shared_with = (select auth.uid()) or (select private.owns_list(list_id)));

create policy "Voir les partages automatiques qui me concernent" on public.auto_list_shares for select to authenticated
  using (owner_id = (select auth.uid()) or shared_with = (select auth.uid()));
create policy "Retirer ou renoncer à un partage automatique" on public.auto_list_shares for delete to authenticated
  using (owner_id = (select auth.uid()) or shared_with = (select auth.uid()));

revoke all on public.list_shares, public.auto_list_shares from anon;
revoke insert, update on public.list_shares, public.auto_list_shares from authenticated;

-- Liens : une liste seulement si elle est à moi ET prête (décision 044)
drop policy "Créer mes liens de partage" on public.share_links;
create policy "Créer mes liens de partage" on public.share_links for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (
      kind in ('library', 'auto_lists')
      or (kind = 'recipe' and exists (
        select 1 from public.recipes r
        where r.id = recipe_id and r.owner_id = (select auth.uid()) and not r.is_example
      ))
      or (kind = 'list' and exists (
        select 1 from public.shopping_lists l
        where l.id = list_id and l.owner_id = (select auth.uid()) and l.status <> 'draft'
      ))
    )
  );

-- -----------------------------------------------------------------------------
-- Partager une liste (ou mes listes futures) par email.
-- kind : 'list' (target_list obligatoire) ou 'auto_lists'.
-- Renvoie 'shared', 'already', 'no_account' ou 'self' (comme share_by_email).
-- -----------------------------------------------------------------------------
create or replace function public.share_list_by_email(kind text, target_list uuid, target_email text)
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
  if kind not in ('list', 'auto_lists') then
    raise exception 'Type de partage inconnu';
  end if;
  if kind = 'list' and not exists (
    select 1 from public.shopping_lists l
    where l.id = target_list and l.owner_id = current_user_id and l.status <> 'draft'
  ) then
    raise exception 'Liste introuvable ou pas encore prête';
  end if;

  select u.id into recipient
  from auth.users u
  where lower(u.email) = lower(trim(target_email)) and u.email_confirmed_at is not null;
  if recipient is null then return 'no_account'; end if;
  if recipient = current_user_id then return 'self'; end if;

  if kind = 'list' then
    insert into public.list_shares (list_id, shared_with) values (target_list, recipient)
    on conflict do nothing;
  else
    insert into public.auto_list_shares (owner_id, shared_with) values (current_user_id, recipient)
    on conflict do nothing;
  end if;
  return case when found then 'shared' else 'already' end;
end;
$$;
revoke all on function public.share_list_by_email(text, uuid, text) from public, anon;
grant execute on function public.share_list_by_email(text, uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Liens : l'aperçu et l'acceptation gèrent maintenant les listes.
-- (le type de retour de preview_share_link change : on la recrée)
-- -----------------------------------------------------------------------------
drop function public.preview_share_link(text);
create function public.preview_share_link(token text)
returns table (status text, kind text, owner_name text, recipe_title text, list_created_at timestamptz)
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
    return query select 'invalid'::text, null::text, null::text, null::text, null::timestamptz;
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
    (select l.created_at from public.shopping_lists l where l.id = link.list_id);
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
  else
    insert into public.auto_list_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
  end if;

  update public.share_links set used_at = now(), used_by = current_user_id where id = link.id;
  return 'accepted';
end;
$$;

-- -----------------------------------------------------------------------------
-- Partage automatique : appliqué quand une liste devient prête (finalize_list)
-- -----------------------------------------------------------------------------
create or replace function private.apply_auto_list_shares(target_list uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.list_shares (list_id, shared_with)
  select l.id, a.shared_with
  from public.shopping_lists l
  join public.auto_list_shares a on a.owner_id = l.owner_id
  where l.id = target_list and l.owner_id = (select auth.uid())
  on conflict do nothing;
$$;
revoke all on function private.apply_auto_list_shares(uuid) from public, anon;
grant execute on function private.apply_auto_list_shares(uuid) to authenticated;

create or replace function public.finalize_list(target_list uuid, lines jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.shopping_lists l
    where l.id = target_list and l.owner_id = (select auth.uid()) and l.status = 'draft'
  ) then
    raise exception 'Liste introuvable ou déjà terminée';
  end if;

  delete from public.shopping_list_items sli where sli.list_id = target_list;

  insert into public.shopping_list_items
    (list_id, item_id, line_key, origin, computed_quantity, quantity, unit, included, recipe_ids)
  select
    target_list,
    (l.value ->> 'item_id')::uuid,
    'final:' || l.ordinality,
    l.value ->> 'origin',
    null,
    (l.value ->> 'quantity')::numeric,
    l.value ->> 'unit',
    true,
    coalesce(array(select jsonb_array_elements_text(l.value -> 'recipe_ids'))::uuid[], '{}')
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) with ordinality as l (value, ordinality);

  update public.shopping_lists set status = 'ready' where id = target_list;
  perform private.apply_auto_list_shares(target_list);
end;
$$;
