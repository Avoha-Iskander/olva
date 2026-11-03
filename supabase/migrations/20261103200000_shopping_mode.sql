-- =============================================================================
-- Lot 6 — Mode courses en ligne et temps réel (US-CRS-01, US-CRS-02 ; décision 053)
--
-- 1. Temps réel : les lignes et les listes sont « publiées » vers Supabase Realtime.
--    Chaque téléphone abonné à une liste reçoit les changements, dans la limite de
--    ce que les règles RLS lui permettent de voir.
-- 2. start_shopping : une liste prête passe « en courses » (créateur ou co-éditeur).
-- 3. set_line_checked : cocher / décocher, en notant qui et quand.
-- =============================================================================

alter publication supabase_realtime add table public.shopping_list_items, public.shopping_lists;
-- « replica identity full » : chaque changement envoyé contient la ligne entière, dont
-- list_id ; c'est ce qui permet de ne s'abonner qu'aux lignes d'UNE liste.
alter table public.shopping_list_items replica identity full;

-- -----------------------------------------------------------------------------
-- Commencer les courses : « prête » → « en courses ». Sans effet si c'est déjà le cas.
-- security definer : seul le créateur peut modifier une liste, mais un co-éditeur doit
-- pouvoir commencer les courses ; la fonction vérifie elle-même ce droit.
-- -----------------------------------------------------------------------------
create function public.start_shopping(target_list uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_edit_list(target_list) then
    raise exception 'Liste introuvable' using errcode = '42501';
  end if;
  update public.shopping_lists
    set status = 'shopping'
    where id = target_list and status = 'ready';
end;
$$;
revoke all on function public.start_shopping(uuid) from public, anon;
grant execute on function public.start_shopping(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Cocher / décocher une ligne. Qui a coché (checked_by) vient de la session, jamais
-- du navigateur. Une ligne déjà cochée garde son premier « cocheur » : cocher deux
-- fois ne change rien (base de la règle « coché gagne », hors ligne au lot 6.3).
-- -----------------------------------------------------------------------------
create function public.set_line_checked(line_id uuid, value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_list uuid;
begin
  select list_id into target_list from public.shopping_list_items where id = line_id;
  if target_list is null or not private.can_edit_list(target_list) then
    raise exception 'Ligne introuvable' using errcode = '42501';
  end if;

  if value then
    update public.shopping_list_items
      set checked = true,
          checked_by = coalesce(checked_by, (select auth.uid())),
          checked_at = coalesce(checked_at, now())
      where id = line_id and not checked;
  else
    update public.shopping_list_items
      set checked = false, checked_by = null, checked_at = null
      where id = line_id and checked;
  end if;
end;
$$;
revoke all on function public.set_line_checked(uuid, boolean) from public, anon;
grant execute on function public.set_line_checked(uuid, boolean) to authenticated;
