-- =============================================================================
-- Lot 5 — Import photo sur plusieurs pages (US-REC-02 ; SPEC décision 049)
--
-- Une recette peut occuper jusqu'à 3 pages : un import garde donc une LISTE de
-- photos (photo_paths, tableau dans l'ordre des pages) au lieu d'une seule.
-- Cette table n'existe encore que sur dev : on la transforme sans perte.
-- =============================================================================

alter table public.recipe_imports add column photo_paths text[];
update public.recipe_imports set photo_paths = array[photo_path];
alter table public.recipe_imports
  alter column photo_paths set not null,
  -- de 1 à 3 pages
  add constraint recipe_imports_photo_paths_count
    check (cardinality(photo_paths) between 1 and 3);

-- La règle « la photo doit être dans mon dossier » vérifie maintenant chaque page
drop policy "Créer mes imports" on public.recipe_imports;
alter table public.recipe_imports drop column photo_path;

create policy "Créer mes imports" on public.recipe_imports for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and not exists (
      select 1
      from unnest(photo_paths) as page(path)
      where page.path not like (select auth.uid())::text || '/%'
    )
  );
