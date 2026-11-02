-- =============================================================================
-- Lot 4 — Étape 3 : pré-liste anti-oubli et articles libres (US-LST-03, US-LST-04)
--
-- La pré-liste = mes articles habituels (alimentaires ou non), avec leur quantité
-- habituelle. À l'étape 3, je coche ce qui manque. Elle démarre préremplie d'une
-- quinzaine d'articles courants (décision 044), une seule fois par compte.
-- =============================================================================

create table public.prelist_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  unit text not null references public.units (code),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index prelist_items_item_id_idx on public.prelist_items (item_id);
create index prelist_items_unit_idx on public.prelist_items (unit);
comment on table public.prelist_items is 'Pré-liste anti-oubli : mes articles habituels et leur quantité.';

alter table public.prelist_items enable row level security;
create policy "Voir ma pré-liste" on public.prelist_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Ajouter à ma pré-liste" on public.prelist_items for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Modifier ma pré-liste" on public.prelist_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Retirer de ma pré-liste" on public.prelist_items for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.prelist_items from anon;

-- La pré-liste par défaut n'est créée qu'une fois : si je la vide, elle reste vide
alter table public.profiles add column prelist_initialized boolean not null default false;

-- -----------------------------------------------------------------------------
-- Crée ma pré-liste par défaut si ce n'est pas déjà fait (appelée à l'étape 3).
-- security definer : elle marque le profil (colonne non modifiable par l'application).
-- -----------------------------------------------------------------------------
create or replace function public.ensure_my_prelist()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  -- « for update » : deux appels simultanés ne créent pas la pré-liste deux fois
  if (select p.prelist_initialized from public.profiles p where p.id = current_user_id for update) then
    return;
  end if;

  insert into public.prelist_items (user_id, item_id, quantity, unit, position)
  select current_user_id, i.id, v.quantity, v.unit, v.position
  from (values
    (1, 'Lait demi-écrémé', 2::numeric, 'l'),
    (2, 'Baguette', 1, 'piece'),
    (3, 'Œuf', 6, 'piece'),
    (4, 'Beurre doux', 250, 'g'),
    (5, 'Yaourt nature', 4, 'piece'),
    (6, 'Café moulu', 1, 'paquet'),
    (7, 'Céréales', 1, 'paquet'),
    (8, 'Eau plate', 6, 'bouteille'),
    (9, 'Papier toilette', 1, 'paquet'),
    (10, 'Essuie-tout', 1, 'paquet'),
    (11, 'Liquide vaisselle', 1, 'bouteille'),
    (12, 'Pastilles lave-vaisselle', 1, 'paquet'),
    (13, 'Lessive', 1, 'piece'),
    (14, 'Éponges', 1, 'paquet'),
    (15, 'Sacs poubelle', 1, 'paquet')
  ) as v (position, name, quantity, unit)
  join public.items i on i.owner_id is null and i.name = v.name
  on conflict do nothing;

  update public.profiles set prelist_initialized = true where id = current_user_id;
end;
$$;
revoke all on function public.ensure_my_prelist() from public, anon;
grant execute on function public.ensure_my_prelist() to authenticated;

-- -----------------------------------------------------------------------------
-- Étape 3 : enregistre les lignes « pré-liste » et « article libre » d'une liste,
-- sans toucher aux lignes de la revue (recettes, ingrédients de base).
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
  where sli.list_id = target_list and sli.origin in ('prelist', 'free');

  insert into public.shopping_list_items (list_id, item_id, line_key, origin, quantity, unit)
  select
    target_list,
    (l.value ->> 'item_id')::uuid,
    l.value ->> 'line_key',
    l.value ->> 'origin',
    (l.value ->> 'quantity')::numeric,
    l.value ->> 'unit'
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) as l (value)
  where l.value ->> 'origin' in ('prelist', 'free');

  update public.shopping_lists set status = status where id = target_list;
end;
$$;
revoke all on function public.save_extras(uuid, jsonb) from public, anon;
grant execute on function public.save_extras(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- « Terminer la liste » : remplace les lignes de préparation par les lignes
-- regroupées (une par article, calculées par l'application : src/lib/list-lines.ts)
-- et passe la liste de brouillon à prête, en un seul bloc.
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
end;
$$;
revoke all on function public.finalize_list(uuid, jsonb) from public, anon;
grant execute on function public.finalize_list(uuid, jsonb) to authenticated;
