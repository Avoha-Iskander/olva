-- =============================================================================
-- Partage vers Olva — import d'un texte collé (US-REC-07 ; décision 065)
--
-- recipe_imports : un import vient désormais SOIT de photos (1 à 3 pages), SOIT d'un lien,
-- SOIT d'un texte collé (la légende d'une publication Instagram, une note…). Le texte
-- lui-même n'est pas gardé : seule la trace de l'import (modèle, résultat) l'est.
-- =============================================================================

alter table public.recipe_imports
  add column pasted_text boolean not null default false,
  drop constraint recipe_imports_source_check,
  add constraint recipe_imports_source_check check (
    (photo_paths is not null and cardinality(photo_paths) between 1 and 3
      and source_url is null and not pasted_text)
    or (photo_paths is null and source_url is not null and not pasted_text)
    or (photo_paths is null and source_url is null and pasted_text)
  );

comment on column public.recipe_imports.pasted_text is
  'Vrai pour un import depuis un texte collé (ni photo, ni lien).';
-- pasted_text ne figure pas dans les colonnes modifiables : la source d'un import ne change pas.
