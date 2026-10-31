-- =============================================================================
-- Lot 2.3 — Recherche de recettes (US-REC-04)
--
-- Cherche dans le titre ET dans les noms d'ingrédients, sans tenir compte
-- des majuscules ni des accents (« creme » trouve « Crème fraîche »).
-- La fonction s'exécute avec les droits de l'utilisateur (security invoker) :
-- les règles d'accès s'appliquent, chacun ne trouve que ce qu'il peut voir.
-- =============================================================================

create extension if not exists unaccent with schema extensions;

-- Normalise un texte pour la comparaison : minuscules, sans accents
create or replace function private.normalize_text(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')));
$$;

grant execute on function private.normalize_text(text) to authenticated;

create or replace function public.search_my_recipes(search text default null, collection uuid default null)
returns setof public.recipes
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    -- Les caractères spéciaux de LIKE (% et _) sont neutralisés
    select '%' || replace(replace(replace(private.normalize_text(trim(search)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select r.*
  from public.recipes r, params p
  where
    (collection is null or exists (
      select 1 from public.recipe_collections rc
      where rc.recipe_id = r.id and rc.collection_id = collection
    ))
    and (
      search is null or trim(search) = ''
      or private.normalize_text(r.title) like p.pattern
      or exists (
        select 1
        from public.recipe_ingredients ri
        join public.items i on i.id = ri.item_id
        where ri.recipe_id = r.id and private.normalize_text(i.name) like p.pattern
      )
    )
  order by r.updated_at desc;
$$;

revoke all on function public.search_my_recipes(text, uuid) from public, anon;
grant execute on function public.search_my_recipes(text, uuid) to authenticated;
