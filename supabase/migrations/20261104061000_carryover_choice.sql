-- =============================================================================
-- Lot 6 — Étape 3 : garder ou retirer un report (US-CRS-03 ; décision 055)
--
-- Les reports sont proposés cochés par défaut. Un report RETIRÉ est enregistré quand
-- même (included = false) : sans cela, il reviendrait coché au rechargement de l'étape.
-- save_extras accepte donc un champ « included » (vrai par défaut).
-- =============================================================================

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

  insert into public.shopping_list_items (list_id, item_id, line_key, origin, quantity, unit, included)
  select
    target_list,
    (l.value ->> 'item_id')::uuid,
    l.value ->> 'line_key',
    l.value ->> 'origin',
    (l.value ->> 'quantity')::numeric,
    l.value ->> 'unit',
    coalesce((l.value ->> 'included')::boolean, true)
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) as l (value)
  where l.value ->> 'origin' in ('prelist', 'free', 'carryover');

  update public.shopping_lists set status = status where id = target_list;
end;
$$;
