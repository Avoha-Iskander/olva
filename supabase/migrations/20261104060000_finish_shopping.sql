-- =============================================================================
-- Lot 6 — Fin des courses, report et historique (US-CRS-03 ; décisions 053 et 055)
--
-- 1. carryover_items : la réserve « à reporter » de chaque personne (articles non
--    cochés de ses dernières courses), proposée à l'étape 3 de sa prochaine liste.
-- 2. finish_shopping : termine une liste (créateur ou co-éditeur) et verse les articles
--    non cochés dans la réserve du CRÉATEUR de la liste.
-- 3. save_extras accepte les lignes « carryover » ; finalize_list vide la réserve.
-- =============================================================================

create table public.carryover_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  unit text not null references public.units (code),
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id, unit)
);
create index carryover_items_item_id_idx on public.carryover_items (item_id);
create index carryover_items_unit_idx on public.carryover_items (unit);
comment on table public.carryover_items is
  'Articles non cochés de mes dernières courses, à reporter sur ma prochaine liste.';

alter table public.carryover_items enable row level security;
create policy "Voir mes reports" on public.carryover_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Retirer mes reports" on public.carryover_items for delete to authenticated
  using (user_id = (select auth.uid()));
-- Pas d'ajout ni de modification directe : seule finish_shopping remplit la réserve
revoke all on public.carryover_items from anon;
revoke insert, update on public.carryover_items from authenticated;

-- -----------------------------------------------------------------------------
-- Terminer les courses. security definer : un co-éditeur doit pouvoir terminer, et
-- les non-cochés vont dans la réserve du créateur (qu'il ne pourrait pas écrire lui-même).
-- Les droits sont vérifiés ici. Une même ligne (article + unité) s'additionne.
-- Renvoie le nombre d'articles reportés.
-- -----------------------------------------------------------------------------
create function public.finish_shopping(target_list uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  list_owner uuid;
  carried integer;
begin
  if not private.can_edit_list(target_list) then
    raise exception 'Liste introuvable' using errcode = '42501';
  end if;

  select owner_id into list_owner
  from public.shopping_lists
  where id = target_list and status in ('ready', 'shopping')
  for update;
  if list_owner is null then
    raise exception 'Liste déjà terminée' using errcode = '22023';
  end if;

  insert into public.carryover_items as c (user_id, item_id, unit, quantity)
  select list_owner, sli.item_id, sli.unit, sum(sli.quantity)
  from public.shopping_list_items sli
  where sli.list_id = target_list and sli.included and not sli.checked
  group by sli.item_id, sli.unit
  on conflict (user_id, item_id, unit)
    do update set quantity = c.quantity + excluded.quantity, created_at = now();
  get diagnostics carried = row_count;

  update public.shopping_lists
    set status = 'done', finished_at = now()
    where id = target_list;
  return carried;
end;
$$;
revoke all on function public.finish_shopping(uuid) from public, anon;
grant execute on function public.finish_shopping(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Étape 3 : les lignes « carryover » (reports gardés) s'enregistrent comme la pré-liste
-- -----------------------------------------------------------------------------
create or replace function public.save_extras(target_list uuid, lines jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.owns_list(target_list) then
    raise exception 'Liste introuvable';
  end if;

  delete from public.shopping_list_items sli
  where sli.list_id = target_list and sli.origin in ('prelist', 'free', 'carryover');

  insert into public.shopping_list_items (list_id, item_id, line_key, origin, quantity, unit)
  select
    target_list,
    (l.value ->> 'item_id')::uuid,
    l.value ->> 'line_key',
    l.value ->> 'origin',
    (l.value ->> 'quantity')::numeric,
    l.value ->> 'unit'
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) as l (value)
  where l.value ->> 'origin' in ('prelist', 'free', 'carryover');

  update public.shopping_lists set status = status where id = target_list;
end;
$$;

-- -----------------------------------------------------------------------------
-- Terminer la préparation : en plus, la réserve à reporter est vidée (les reports gardés
-- sont dans la liste, les reports retirés sont oubliés).
-- -----------------------------------------------------------------------------
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

  delete from public.carryover_items where user_id = (select auth.uid());
end;
$$;
