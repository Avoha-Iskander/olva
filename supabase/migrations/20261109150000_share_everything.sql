-- =============================================================================
-- « Tout partager automatiquement » (US-CPT-03, décision 076)
--
-- Un seul lien partage à la fois toutes mes recettes (en lecture, y compris les
-- futures) et mes nouvelles listes (en co-édition). Nouveau type de lien :
-- « everything ». L'acceptation crée les deux partages habituels (library_shares
-- et auto_list_shares) : chacun se retire ensuite séparément.
-- Le partage par email n'a pas besoin de SQL : l'app appelle les deux fonctions
-- existantes (share_by_email et share_list_by_email).
-- =============================================================================

alter table public.share_links drop constraint share_links_kind_check;
alter table public.share_links add constraint share_links_kind_check
  check (kind in ('recipe', 'library', 'list', 'auto_lists', 'everything'));

drop policy "Créer mes liens de partage" on public.share_links;
create policy "Créer mes liens de partage" on public.share_links for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (
      kind in ('library', 'auto_lists', 'everything')
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

-- Seule nouveauté par rapport au lot 4 : la branche « everything »
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
  elsif link.kind = 'everything' then
    insert into public.library_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
    insert into public.auto_list_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
  else
    insert into public.auto_list_shares (owner_id, shared_with) values (link.owner_id, current_user_id)
    on conflict do nothing;
  end if;

  update public.share_links set used_at = now(), used_by = current_user_id where id = link.id;
  return 'accepted';
end;
$$;
revoke all on function public.accept_share_link(text) from public, anon;
grant execute on function public.accept_share_link(text) to authenticated;
