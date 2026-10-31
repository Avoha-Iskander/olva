-- =============================================================================
-- Lot 2.2 — Recettes, ingrédients, collections, photos (SPEC §6.1, §7)
--
-- Une recette appartient à son créateur (owner_id). Le partage (lot 2.7)
-- ajoutera des droits de lecture ; pour l'instant chacun ne voit que les siennes.
-- =============================================================================

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  servings integer not null check (servings between 1 and 50),
  steps text[] not null default '{}', -- étapes dans l'ordre
  book_title text check (char_length(book_title) <= 120),
  book_page integer check (book_page > 0),
  photo_path text, -- photo d'illustration (espace de stockage recipe-photos)
  thumb_path text, -- miniature pour les listes
  import_photo_path text, -- photo de la page de livre (import IA, lot 5)
  is_example boolean not null default false, -- recette d'exemple offerte à l'arrivée
  copied_from uuid references public.recipes (id) on delete set null, -- copie d'une recette partagée
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.recipes is 'Recettes ; appartiennent à leur créateur.';
create index recipes_owner_id_idx on public.recipes (owner_id);
create index recipes_copied_from_idx on public.recipes (copied_from);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null,
  item_id uuid not null references public.items (id),
  -- Quantité facultative : vide = « au goût » (sel, poivre, persil pour décorer…)
  quantity numeric check (quantity > 0),
  unit text references public.units (code),
  note text check (char_length(note) <= 120), -- ex. « émincé », « bien mûres »
  -- Une quantité va toujours avec une unité, et inversement
  check ((quantity is null) = (unit is null))
);
comment on table public.recipe_ingredients is 'Ingrédients d''une recette ; quantité vide = au goût.';
create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id, position);
create index recipe_ingredients_item_id_idx on public.recipe_ingredients (item_id);
create index recipe_ingredients_unit_idx on public.recipe_ingredients (unit);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index collections_owner_name_key on public.collections (owner_id, lower(name));
comment on table public.collections is 'Collections de recettes (ex. « Plats d''hiver »).';

create table public.recipe_collections (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (recipe_id, collection_id)
);
create index recipe_collections_collection_id_idx on public.recipe_collections (collection_id);

-- Mise à jour automatique de updated_at (fonction créée avec les profils)
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Fonctions d'aide aux règles d'accès (évitent de répéter les sous-requêtes)
-- -----------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated;

-- La recette m'appartient-elle ?
create or replace function private.owns_recipe(target_recipe uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes
    where id = target_recipe and owner_id = (select auth.uid())
  );
$$;

-- La collection m'appartient-elle ?
create or replace function private.owns_collection(target_collection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.collections
    where id = target_collection and owner_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_recipe(uuid) from public, anon;
revoke all on function private.owns_collection(uuid) from public, anon;
grant execute on function private.owns_recipe(uuid) to authenticated;
grant execute on function private.owns_collection(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Règles d'accès : chacun gère uniquement ses recettes et ses collections
-- -----------------------------------------------------------------------------
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.collections enable row level security;
alter table public.recipe_collections enable row level security;

create policy "Voir mes recettes" on public.recipes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Créer mes recettes" on public.recipes for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Modifier mes recettes" on public.recipes for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Supprimer mes recettes" on public.recipes for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "Voir les ingrédients de mes recettes" on public.recipe_ingredients for select to authenticated
  using ((select private.owns_recipe(recipe_id)));
create policy "Ajouter des ingrédients à mes recettes" on public.recipe_ingredients for insert to authenticated
  with check ((select private.owns_recipe(recipe_id)));
create policy "Modifier les ingrédients de mes recettes" on public.recipe_ingredients for update to authenticated
  using ((select private.owns_recipe(recipe_id))) with check ((select private.owns_recipe(recipe_id)));
create policy "Supprimer les ingrédients de mes recettes" on public.recipe_ingredients for delete to authenticated
  using ((select private.owns_recipe(recipe_id)));

create policy "Voir mes collections" on public.collections for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Créer mes collections" on public.collections for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Modifier mes collections" on public.collections for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Supprimer mes collections" on public.collections for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Ranger une recette dans une collection : les deux doivent être à moi
create policy "Voir mes rangements" on public.recipe_collections for select to authenticated
  using ((select private.owns_collection(collection_id)));
create policy "Ranger mes recettes" on public.recipe_collections for insert to authenticated
  with check ((select private.owns_recipe(recipe_id)) and (select private.owns_collection(collection_id)));
create policy "Retirer de mes collections" on public.recipe_collections for delete to authenticated
  using ((select private.owns_collection(collection_id)));

revoke all on public.recipes, public.recipe_ingredients, public.collections, public.recipe_collections from anon;
-- Modification limitée au contenu : le propriétaire et les dates ne peuvent pas être changés
revoke update on public.recipes from authenticated;
grant update (title, servings, steps, book_title, book_page, photo_path, thumb_path, import_photo_path, is_example)
  on public.recipes to authenticated;

-- -----------------------------------------------------------------------------
-- Photos : espace de stockage privé, un dossier par utilisateur
-- Chemin des fichiers : <id utilisateur>/<id recette>/<nom du fichier>
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "Voir mes photos de recettes" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Envoyer mes photos de recettes" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Remplacer mes photos de recettes" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Supprimer mes photos de recettes" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
