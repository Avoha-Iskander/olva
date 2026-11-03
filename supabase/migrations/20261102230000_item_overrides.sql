-- =============================================================================
-- Lot 4 — Personnaliser un article commun (US-CAT-03)
--
-- Je peux changer le rayon, l'indicateur « ingrédient de base » (et son unité de
-- conditionnement) d'un article du catalogue commun : ma valeur remplace celle du
-- catalogue, pour moi seulement. Les conversions personnelles existent déjà
-- (unit_conversions avec owner_id = moi).
-- Une liste partagée est triée selon les rayons de son créateur (SPEC §3.1) : ses
-- co-éditeurs peuvent donc lire ses personnalisations.
-- =============================================================================

create table public.item_overrides (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  aisle_id smallint references public.aisles (id), -- vide : rayon du catalogue
  is_staple boolean, -- vide : valeur du catalogue
  purchase_unit text references public.units (code),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id),
  -- Un ingrédient de base s'achète par son unité de conditionnement
  check (is_staple is not true or purchase_unit is not null)
);
create index item_overrides_item_id_idx on public.item_overrides (item_id);
create index item_overrides_aisle_id_idx on public.item_overrides (aisle_id);
create index item_overrides_purchase_unit_idx on public.item_overrides (purchase_unit);
comment on table public.item_overrides is 'Mes personnalisations des articles communs (rayon, ingrédient de base).';

create trigger item_overrides_set_updated_at
  before update on public.item_overrides
  for each row execute function public.set_updated_at();

-- Les co-éditeurs d'une de mes listes voient mes personnalisations (ordre des rayons)
create or replace function private.is_list_partner(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.list_shares s
    join public.shopping_lists l on l.id = s.list_id
    where l.owner_id = target_user and s.shared_with = (select auth.uid())
  );
$$;
revoke all on function private.is_list_partner(uuid) from public, anon;
grant execute on function private.is_list_partner(uuid) to authenticated;

alter table public.item_overrides enable row level security;
create policy "Voir mes personnalisations et celles des créateurs de mes listes partagées"
  on public.item_overrides for select to authenticated
  using (user_id = (select auth.uid()) or private.is_list_partner(user_id));
create policy "Créer mes personnalisations" on public.item_overrides for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Modifier mes personnalisations" on public.item_overrides for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Supprimer mes personnalisations" on public.item_overrides for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.item_overrides from anon;
