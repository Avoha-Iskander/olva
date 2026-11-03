-- =============================================================================
-- Lot 5 — Pages d'import attachées à la recette (US-REC-02 ; SPEC décision 049)
--
-- Une recette importée par photo garde ses pages d'origine (1 à 3), dans l'ordre.
-- L'ancienne colonne import_photo_path (une seule photo) n'a jamais servi : elle
-- est vide partout, on la remplace par une liste.
-- =============================================================================

-- Vrai si tous les chemins sont dans le dossier donné (« <utilisateur>/<recette>/… »).
-- Une contrainte CHECK ne peut pas contenir de sous-requête : on passe par une fonction.
create function private.paths_in_folder(paths text[], folder text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(starts_with(p, folder)), true) from unnest(paths) as p;
$$;
-- La contrainte est vérifiée avec les droits de qui écrit la recette
revoke all on function private.paths_in_folder(text[], text) from public, anon;
grant execute on function private.paths_in_folder(text[], text) to authenticated, service_role;

alter table public.recipes
  add column import_photo_paths text[] not null default '{}',
  add constraint recipes_import_photo_paths_check check (
    cardinality(import_photo_paths) <= 3
    -- les pages sont forcément dans le dossier de la recette
    and private.paths_in_folder(import_photo_paths, owner_id::text || '/' || id::text || '/')
  );
comment on column public.recipes.import_photo_paths is
  'Pages du livre photographiées lors de l''import (dans le dossier de la recette).';

alter table public.recipes drop column import_photo_path;

-- Le propriétaire peut rattacher les pages à sa recette (colonne ajoutée aux droits)
grant update (import_photo_paths) on public.recipes to authenticated;
