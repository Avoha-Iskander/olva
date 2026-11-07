-- =============================================================================
-- Lot 7ter — Fin des courses : nouvelle liste avec les articles restants
-- (US-CRS-03 révisée ; décision 070, remplace la réserve à reporter de la décision 055)
--
-- « Terminer » passe la liste dans l'historique et, si on le demande (case cochée par
-- défaut), crée tout de suite une nouvelle liste PRÊTE avec les seuls articles non
-- cochés, pour le créateur de la liste et avec les mêmes partages.
-- La réserve à reporter (carryover_items) et son usage dans la pré-liste disparaissent.
-- =============================================================================

-- 1. Terminer la préparation : la réserve n'existe plus, on ne la vide plus
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

-- 2. Terminer les courses. security definer : un co-éditeur doit pouvoir terminer, et la
--    nouvelle liste appartient au CRÉATEUR (le co-éditeur ne pourrait pas la créer pour
--    lui). Les droits sont vérifiés ici.
--    Renvoie l'identifiant de la nouvelle liste, ou null (rien à reprendre, ou case décochée).
drop function public.finish_shopping(uuid);

create function public.finish_shopping(target_list uuid, carry_over boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  list_owner uuid;
  new_list uuid;
begin
  if not private.can_edit_list(target_list) then
    raise exception 'Liste introuvable' using errcode = '42501';
  end if;

  -- « for update » : deux téléphones qui terminent en même temps ne créent pas deux listes
  select owner_id into list_owner
  from public.shopping_lists
  where id = target_list and status in ('ready', 'shopping')
  for update;
  if list_owner is null then
    raise exception 'Liste déjà terminée' using errcode = '22023';
  end if;

  if carry_over and exists (
    select 1 from public.shopping_list_items sli
    where sli.list_id = target_list and sli.included and not sli.checked
  ) then
    -- La nouvelle liste, prête, au créateur (pas de menu : ce sont des restes)
    insert into public.shopping_lists (owner_id, status)
    values (list_owner, 'ready')
    returning id into new_list;

    -- Les articles non cochés, tels quels
    insert into public.shopping_list_items
      (list_id, item_id, line_key, origin, quantity, unit, included, recipe_ids)
    select new_list, sli.item_id, 'reste:' || row_number() over (order by sli.created_at),
      'carryover', sli.quantity, sli.unit, true, sli.recipe_ids
    from public.shopping_list_items sli
    where sli.list_id = target_list and sli.included and not sli.checked;

    -- Les mêmes partages
    insert into public.list_shares (list_id, shared_with)
    select new_list, ls.shared_with
    from public.list_shares ls
    where ls.list_id = target_list;
  end if;

  update public.shopping_lists
    set status = 'done', finished_at = now()
    where id = target_list;

  return new_list;
end;
$$;
revoke all on function public.finish_shopping(uuid, boolean) from public, anon;
grant execute on function public.finish_shopping(uuid, boolean) to authenticated;

-- 3. La réserve à reporter disparaît (ses règles d'accès et index avec elle)
drop table public.carryover_items;
