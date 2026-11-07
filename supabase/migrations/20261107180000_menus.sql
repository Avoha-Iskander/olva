-- =============================================================================
-- Lot 7bis — Menus de la semaine (US-MEN-01 à 04 ; SPEC §6.3 et §7 ; décision 068)
--
-- Un menu = des recettes et leurs portions, sans jours. La liste de courses se
-- crée ensuite depuis le menu (shopping_lists.menu_id). Les menus ne se
-- partagent pas : seul leur créateur les voit et les modifie.
-- =============================================================================

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- « Mes menus » : du plus récent au plus ancien
create index menus_owner_id_created_at_idx on public.menus (owner_id, created_at desc);
comment on table public.menus is 'Menus de la semaine (recettes + portions, sans jours) ; non partagés.';

create trigger menus_set_updated_at
  before update on public.menus
  for each row execute function public.set_updated_at();

-- Recettes du menu. added_at sert à repérer les recettes ajoutées après la
-- création de la liste (« Pas encore dans la liste », US-MEN-03).
create table public.menu_recipes (
  menu_id uuid not null references public.menus (id) on delete cascade,
  -- Une recette supprimée disparaît des menus
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings integer not null check (servings between 1 and 50),
  added_at timestamptz not null default now(),
  primary key (menu_id, recipe_id)
);
create index menu_recipes_recipe_id_idx on public.menu_recipes (recipe_id);

-- La liste créée depuis un menu. Supprimer le menu garde la liste (lien vidé).
-- Vide pour une liste sans recette (US-LST-08) et pour les listes d'avant les menus.
alter table public.shopping_lists
  add column menu_id uuid references public.menus (id) on delete set null;
create index shopping_lists_menu_id_idx on public.shopping_lists (menu_id);

-- -----------------------------------------------------------------------------
-- Règles d'accès : mes menus uniquement (pas de partage, décision 068)
-- -----------------------------------------------------------------------------
create or replace function private.owns_menu(target_menu uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.menus
    where id = target_menu and owner_id = (select auth.uid())
  );
$$;
revoke all on function private.owns_menu(uuid) from public, anon;
grant execute on function private.owns_menu(uuid) to authenticated;

alter table public.menus enable row level security;
alter table public.menu_recipes enable row level security;

create policy "Voir mes menus" on public.menus for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Créer mes menus" on public.menus for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Modifier mes menus" on public.menus for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Supprimer mes menus" on public.menus for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "Voir les recettes de mes menus" on public.menu_recipes for select to authenticated
  using ((select private.owns_menu(menu_id)));
-- Une recette ajoutée doit être une que je peux lire (la mienne ou partagée avec moi)
create policy "Ajouter des recettes à mes menus" on public.menu_recipes for insert to authenticated
  with check ((select private.owns_menu(menu_id)) and private.can_read_recipe(recipe_id));
create policy "Modifier les recettes de mes menus" on public.menu_recipes for update to authenticated
  using ((select private.owns_menu(menu_id))) with check ((select private.owns_menu(menu_id)));
create policy "Retirer des recettes de mes menus" on public.menu_recipes for delete to authenticated
  using ((select private.owns_menu(menu_id)));

-- Une liste ne peut être rattachée qu'à un de mes menus. Les co-éditeurs d'une
-- liste partagée ne peuvent pas changer menu_id (le lien appartient au créateur).
create or replace function private.check_list_menu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.menu_id is not null
     and new.menu_id is distinct from (case when tg_op = 'UPDATE' then old.menu_id end)
     and not exists (
       select 1 from public.menus where id = new.menu_id and owner_id = new.owner_id
     ) then
    raise exception 'Ce menu n''appartient pas au créateur de la liste';
  end if;
  return new;
end;
$$;

create trigger shopping_lists_check_menu
  before insert or update of menu_id on public.shopping_lists
  for each row execute function private.check_list_menu();
