-- =============================================================================
-- Lot 3 — Listes de courses : recettes choisies (étape 1) et revue (étape 2)
-- (US-LST-01, US-LST-02, US-LST-05 ; SPEC §7 ; décision 042)
--
-- Une liste est enregistrée dès l'étape 1, en brouillon : rien n'est perdu si
-- on ferme l'app, et le lot 4 (« Mes listes en cours ») s'appuiera dessus.
-- Pour l'instant, chacun ne voit que ses listes (le partage arrive au lot 4).
-- =============================================================================

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- brouillon → prête (lot 4) → en cours de courses → terminée (lot 6)
  status text not null default 'draft' check (status in ('draft', 'ready', 'shopping', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index shopping_lists_owner_id_idx on public.shopping_lists (owner_id, status);
comment on table public.shopping_lists is 'Listes de courses ; créées en brouillon dès l''étape 1.';

create trigger shopping_lists_set_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

-- Étape 1 : recettes choisies et leurs portions
create table public.shopping_list_recipes (
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings integer not null check (servings between 1 and 50),
  position smallint not null,
  primary key (list_id, recipe_id)
);
create index shopping_list_recipes_recipe_id_idx on public.shopping_list_recipes (recipe_id);

-- Lignes de la liste. À l'étape 2, seules les lignes « recipe » et « staple » existent ;
-- les autres origines (pré-liste, article libre, report) arrivent aux lots 4 et 6.
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  item_id uuid not null references public.items (id),
  -- Clé stable de la ligne (article + unité), calculée par l'application (src/lib/review.ts)
  line_key text not null,
  origin text not null check (origin in ('recipe', 'staple', 'prelist', 'free', 'carryover')),
  computed_quantity numeric check (computed_quantity > 0), -- calcul à partir des recettes
  quantity numeric not null check (quantity > 0), -- quantité retenue (ajustée ou non)
  unit text not null references public.units (code),
  included boolean not null default true, -- ligne gardée / ingrédient de base coché
  adjusted boolean not null default false, -- quantité changée à la main
  changed boolean not null default false, -- quantité recalculée depuis la dernière revue
  recipe_ids uuid[] not null default '{}', -- recettes d'où vient la ligne
  -- Pendant les courses (lot 6)
  checked boolean not null default false,
  checked_by uuid references auth.users (id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (list_id, line_key)
);
create index shopping_list_items_item_id_idx on public.shopping_list_items (item_id);
create index shopping_list_items_unit_idx on public.shopping_list_items (unit);
create index shopping_list_items_checked_by_idx on public.shopping_list_items (checked_by);
comment on table public.shopping_list_items is 'Lignes d''une liste de courses (revue des ingrédients, puis courses).';

-- -----------------------------------------------------------------------------
-- Règles d'accès : mes listes uniquement (le lot 4 ajoutera les listes partagées)
-- -----------------------------------------------------------------------------
create or replace function private.owns_list(target_list uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shopping_lists
    where id = target_list and owner_id = (select auth.uid())
  );
$$;
revoke all on function private.owns_list(uuid) from public, anon;
grant execute on function private.owns_list(uuid) to authenticated;

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_recipes enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "Voir mes listes" on public.shopping_lists for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Créer mes listes" on public.shopping_lists for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Modifier mes listes" on public.shopping_lists for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Supprimer mes listes" on public.shopping_lists for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "Voir les recettes de mes listes" on public.shopping_list_recipes for select to authenticated
  using ((select private.owns_list(list_id)));
-- Une recette ajoutée doit être une que je peux lire (la mienne ou partagée avec moi)
create policy "Ajouter des recettes à mes listes" on public.shopping_list_recipes for insert to authenticated
  with check ((select private.owns_list(list_id)) and private.can_read_recipe(recipe_id));
create policy "Modifier les recettes de mes listes" on public.shopping_list_recipes for update to authenticated
  using ((select private.owns_list(list_id))) with check ((select private.owns_list(list_id)));
create policy "Retirer des recettes de mes listes" on public.shopping_list_recipes for delete to authenticated
  using ((select private.owns_list(list_id)));

create policy "Voir les lignes de mes listes" on public.shopping_list_items for select to authenticated
  using ((select private.owns_list(list_id)));
create policy "Ajouter des lignes à mes listes" on public.shopping_list_items for insert to authenticated
  with check ((select private.owns_list(list_id)));
create policy "Modifier les lignes de mes listes" on public.shopping_list_items for update to authenticated
  using ((select private.owns_list(list_id))) with check ((select private.owns_list(list_id)));
create policy "Supprimer les lignes de mes listes" on public.shopping_list_items for delete to authenticated
  using ((select private.owns_list(list_id)));

revoke all on public.shopping_lists, public.shopping_list_recipes, public.shopping_list_items from anon;
-- Le propriétaire d'une liste ne change pas
revoke update on public.shopping_lists from authenticated;
grant update (status, finished_at) on public.shopping_lists to authenticated;

-- -----------------------------------------------------------------------------
-- Étape 1 : remplace les recettes choisies d'une liste, en un seul bloc.
-- recipes : [{ "recipe_id": "…", "servings": 4 }, …] dans l'ordre choisi
-- -----------------------------------------------------------------------------
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

  update public.shopping_lists set updated_at = now() where id = target_list;
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

  update public.shopping_lists set updated_at = now() where id = target_list;
end;
$$;

revoke all on function public.set_list_recipes(uuid, jsonb) from public, anon;
revoke all on function public.save_review(uuid, jsonb) from public, anon;
grant execute on function public.set_list_recipes(uuid, jsonb) to authenticated;
grant execute on function public.save_review(uuid, jsonb) to authenticated;
