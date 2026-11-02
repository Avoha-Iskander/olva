-- =============================================================================
-- Correctif — set_list_recipes et save_review : la mise à jour de updated_at
-- échouait (« permission denied ») car l'application ne peut modifier que
-- status et finished_at. On touche la liste via status ; le déclencheur
-- shopping_lists_set_updated_at met la date à jour.
-- =============================================================================

create or replace function public.set_list_recipes(target_list uuid, recipes jsonb)
returns void
language plpgsql
security invoker -- mes droits : les règles d'accès ci-dessus s'appliquent
set search_path = ''
as $$
begin
  if not private.owns_list(target_list) then
    raise exception 'Liste introuvable';
  end if;

  delete from public.shopping_list_recipes slr where slr.list_id = target_list;
  insert into public.shopping_list_recipes (list_id, recipe_id, servings, position)
  select target_list, (r.value ->> 'recipe_id')::uuid, (r.value ->> 'servings')::integer, r.ordinality::smallint
  from jsonb_array_elements(coalesce(recipes, '[]'::jsonb)) with ordinality as r (value, ordinality);

  -- « status = status » : la liste est « touchée », le déclencheur met updated_at à jour
  -- (l'application n'a pas le droit de modifier updated_at directement)
  update public.shopping_lists set status = status where id = target_list;
end;
$$;

-- -----------------------------------------------------------------------------
-- Étape 2 : enregistre la revue (lignes « recipe » et « staple »), en un seul bloc.
-- Les lignes d'autres origines (pré-liste, articles libres…) ne sont pas touchées.
-- -----------------------------------------------------------------------------
create or replace function public.save_review(target_list uuid, lines jsonb)
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
  where sli.list_id = target_list and sli.origin in ('recipe', 'staple');

  insert into public.shopping_list_items
    (list_id, item_id, line_key, origin, computed_quantity, quantity, unit, included, adjusted, changed, recipe_ids)
  select
    target_list,
    (l.value ->> 'item_id')::uuid,
    l.value ->> 'line_key',
    l.value ->> 'origin',
    (l.value ->> 'computed_quantity')::numeric,
    (l.value ->> 'quantity')::numeric,
    l.value ->> 'unit',
    (l.value ->> 'included')::boolean,
    (l.value ->> 'adjusted')::boolean,
    (l.value ->> 'changed')::boolean,
    coalesce(array(select jsonb_array_elements_text(l.value -> 'recipe_ids'))::uuid[], '{}')
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) as l (value);

  -- « status = status » : la liste est « touchée », le déclencheur met updated_at à jour
  -- (l'application n'a pas le droit de modifier updated_at directement)
  update public.shopping_lists set status = status where id = target_list;
end;
$$;

