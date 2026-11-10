-- =============================================================================
-- Lot 7quinquies (décision 079)
-- 1. Renommer une liste (US-LST-11) : colonne name (vide = « Liste du [date] »).
--    Créateur ET co-éditeurs peuvent renommer : la règle de modification des listes
--    étant réservée au créateur, on passe par une fonction qui vérifie le droit d'édition.
-- 2. Menus terminés (US-MEN-04) : finished_at (vide = en cours). La règle de
--    modification des menus couvre déjà le créateur et les co-éditeurs.
-- =============================================================================

alter table public.shopping_lists
  add column name text check (char_length(name) between 1 and 60);
comment on column public.shopping_lists.name is 'Nom choisi (US-LST-11) ; vide : « Liste du [date] ».';

create function public.rename_list(target_list uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_edit_list(target_list) then
    raise exception 'Liste introuvable' using errcode = '42501';
  end if;
  -- Un nom vide (ou fait d'espaces) remet le nom par défaut
  update public.shopping_lists
    set name = nullif(left(btrim(coalesce(new_name, '')), 60), '')
    where id = target_list;
end;
$$;
revoke all on function public.rename_list(uuid, text) from public, anon;
grant execute on function public.rename_list(uuid, text) to authenticated;

alter table public.menus add column finished_at timestamptz;
comment on column public.menus.finished_at is 'Menu terminé (onglet « Terminés », US-MEN-04) ; vide : en cours.';
