-- =============================================================================
-- Lot 2.1 — Catalogue : unités, rayons, articles, synonymes, conversions
-- (SPEC §6.2, §7 ; US-CAT-01, US-CAT-02, US-CAT-04)
--
-- Le catalogue contient :
--   - des articles COMMUNS (owner_id vide) : visibles par tous, non modifiables ;
--   - des articles PERSONNELS (owner_id = l'utilisateur) : créés à la volée.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Unités (liste fixe) : la colonne to_base permet les conversions universelles
-- à l'intérieur d'une même famille (ex. 1 kg = 1000 g, 1 c. à soupe = 15 ml).
-- -----------------------------------------------------------------------------
create table public.units (
  code text primary key,
  label text not null,
  kind text not null check (kind in ('weight', 'volume', 'count', 'other')),
  to_base numeric, -- facteur vers g (poids) ou ml (volume) ; vide si non convertible
  position smallint not null
);
comment on table public.units is 'Unités autorisées. to_base : facteur vers g ou ml.';

insert into public.units (code, label, kind, to_base, position) values
  ('g', 'g', 'weight', 1, 1),
  ('kg', 'kg', 'weight', 1000, 2),
  ('ml', 'ml', 'volume', 1, 3),
  ('cl', 'cl', 'volume', 10, 4),
  ('l', 'l', 'volume', 1000, 5),
  ('cac', 'c. à café', 'volume', 5, 6),
  ('cas', 'c. à soupe', 'volume', 15, 7),
  ('pincee', 'pincée', 'other', null, 8),
  ('piece', 'pièce', 'count', null, 9),
  ('boite', 'boîte', 'count', null, 10),
  ('sachet', 'sachet', 'count', null, 11),
  ('paquet', 'paquet', 'count', null, 12),
  ('pot', 'pot', 'count', null, 13),
  ('bouteille', 'bouteille', 'count', null, 14),
  ('botte', 'botte', 'count', null, 15),
  ('tranche', 'tranche', 'count', null, 16),
  ('gousse', 'gousse', 'count', null, 17),
  ('brin', 'brin', 'count', null, 18),
  ('feuille', 'feuille', 'count', null, 19);

-- -----------------------------------------------------------------------------
-- Rayons, dans l'ordre d'un parcours type en magasin
-- -----------------------------------------------------------------------------
create table public.aisles (
  id smallint primary key generated always as identity,
  name text not null unique,
  position smallint not null
);
comment on table public.aisles is 'Rayons du magasin ; position = ordre de parcours.';

insert into public.aisles (name, position) values
  ('Fruits et légumes', 1),
  ('Boulangerie', 2),
  ('Boucherie et volaille', 3),
  ('Poissonnerie', 4),
  ('Charcuterie et traiteur', 5),
  ('Crèmerie et œufs', 6),
  ('Fromages', 7),
  ('Pâtes, riz et féculents', 8),
  ('Conserves et bocaux', 9),
  ('Huiles, vinaigres et condiments', 10),
  ('Épices, herbes séchées et aides culinaires', 11),
  ('Épicerie sucrée et pâtisserie', 12),
  ('Petit-déjeuner', 13),
  ('Apéritif', 14),
  ('Surgelés', 15),
  ('Boissons', 16),
  ('Bébé', 17),
  ('Hygiène et beauté', 18),
  ('Entretien et maison', 19),
  ('Animalerie', 20),
  ('Divers', 21);

-- -----------------------------------------------------------------------------
-- Articles
-- -----------------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- vide = article commun
  name text not null check (char_length(trim(name)) between 1 and 80),
  aisle_id smallint not null references public.aisles (id),
  default_unit text not null references public.units (code),
  is_pantry boolean not null default false, -- produit de placard (huile, sel…)
  created_at timestamptz not null default now()
);
comment on table public.items is 'Catalogue : articles communs (owner_id vide) ou personnels.';

-- Un même nom ne peut exister qu'une fois dans le catalogue commun,
-- et une fois dans le catalogue personnel de chaque utilisateur (sans tenir compte des majuscules)
create unique index items_common_name_key on public.items (lower(name)) where owner_id is null;
create unique index items_owner_name_key on public.items (owner_id, lower(name)) where owner_id is not null;
create index items_aisle_id_idx on public.items (aisle_id);
create index items_default_unit_idx on public.items (default_unit);

-- Synonymes : « oignons jaunes » → Oignon (utile pour l'import photo et le Sheets)
create table public.item_aliases (
  alias text primary key check (alias = lower(trim(alias))),
  item_id uuid not null references public.items (id) on delete cascade
);
create index item_aliases_item_id_idx on public.item_aliases (item_id);
comment on table public.item_aliases is 'Synonymes communs des articles (en minuscules).';

-- Conversions propres à un article : 1 from_unit = factor to_unit
-- (ex. tomate cerise : 1 boîte = 250 g)
create table public.unit_conversions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete cascade, -- vide = conversion commune
  from_unit text not null references public.units (code),
  to_unit text not null references public.units (code),
  factor numeric not null check (factor > 0),
  check (from_unit <> to_unit)
);
create unique index unit_conversions_common_key
  on public.unit_conversions (item_id, from_unit, to_unit) where owner_id is null;
create unique index unit_conversions_owner_key
  on public.unit_conversions (owner_id, item_id, from_unit, to_unit) where owner_id is not null;
create index unit_conversions_from_unit_idx on public.unit_conversions (from_unit);
create index unit_conversions_to_unit_idx on public.unit_conversions (to_unit);
comment on table public.unit_conversions is 'Conversions par article : 1 from_unit = factor to_unit.';

-- -----------------------------------------------------------------------------
-- Règles d'accès
-- -----------------------------------------------------------------------------
alter table public.units enable row level security;
alter table public.aisles enable row level security;
alter table public.items enable row level security;
alter table public.item_aliases enable row level security;
alter table public.unit_conversions enable row level security;

-- Unités, rayons, synonymes : lecture seule pour les utilisateurs connectés
create policy "Lire les unités" on public.units for select to authenticated using (true);
create policy "Lire les rayons" on public.aisles for select to authenticated using (true);
create policy "Lire les synonymes" on public.item_aliases for select to authenticated using (true);

-- Articles : je vois le catalogue commun + mes articles ; je ne gère que les miens
-- (le lot 2.7 ajoutera les articles des recettes qu'on me partage)
create policy "Voir le catalogue commun et mes articles"
  on public.items for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "Créer mes articles"
  on public.items for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Modifier mes articles"
  on public.items for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Supprimer mes articles"
  on public.items for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Conversions : mêmes règles que les articles
create policy "Voir les conversions communes et les miennes"
  on public.unit_conversions for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "Créer mes conversions"
  on public.unit_conversions for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Modifier mes conversions"
  on public.unit_conversions for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Supprimer mes conversions"
  on public.unit_conversions for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Aucun accès pour les visiteurs non connectés ; tables de référence non modifiables
revoke all on public.units, public.aisles, public.items, public.item_aliases, public.unit_conversions from anon;
revoke insert, update, delete on public.units, public.aisles, public.item_aliases from authenticated;
