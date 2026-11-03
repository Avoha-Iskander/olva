-- =============================================================================
-- Lot 5 — Import d'une recette depuis un lien (US-REC-07 ; SPEC décision 050)
--
-- recipe_imports : un import vient SOIT de photos (1 à 3 pages), SOIT d'un lien.
-- recipes : le lien d'origine est gardé avec la recette.
-- =============================================================================

alter table public.recipe_imports
  add column source_url text,
  alter column photo_paths drop not null,
  drop constraint recipe_imports_photo_paths_count,
  add constraint recipe_imports_source_check check (
    (photo_paths is not null and cardinality(photo_paths) between 1 and 3 and source_url is null)
    or (photo_paths is null and source_url is not null)
  ),
  add constraint recipe_imports_source_url_check check (
    source_url is null or (length(source_url) <= 2000 and source_url ~ '^https?://')
  );
-- La règle d'insertion « chaque photo est dans mon dossier » reste valable :
-- sans photo (import par lien), il n'y a rien à vérifier.
-- source_url ne figure pas dans les colonnes modifiables : le lien d'un import ne change pas.

alter table public.recipes
  add column source_url text
    check (source_url is null or (length(source_url) <= 2000 and source_url ~ '^https?://'));
comment on column public.recipes.source_url is 'Lien de la page d''origine (import par lien).';

grant update (source_url) on public.recipes to authenticated;
