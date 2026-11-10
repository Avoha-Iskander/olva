-- =============================================================================
-- Recettes d'exemple rangées en collections (US-CPT-02, décision 081)
--
--   Plats       : Quiche lorraine, Gratin dauphinois, Curry de poulet au lait de coco
--   Desserts    : Crêpes
--   Classiques  : Quiche lorraine, Gratin dauphinois, Crêpes
-- Une recette peut être dans plusieurs collections : les exemples le montrent.
-- =============================================================================

-- Collections d'un exemple, d'après son titre
create or replace function private.example_collection_names(title text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case title
    when 'Quiche lorraine' then array['Plats', 'Classiques']
    when 'Gratin dauphinois' then array['Plats', 'Classiques']
    when 'Curry de poulet au lait de coco' then array['Plats']
    when 'Crêpes' then array['Desserts', 'Classiques']
    else array[]::text[]
  end
$$;

-- Range un exemple dans ses collections ; crée celles qui manquent chez son
-- propriétaire (une collection du même nom, s'il en a déjà une, est réutilisée)
create or replace function private.file_example_recipe(target_recipe uuid, target_owner uuid, title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  collection_name text;
  collection uuid;
begin
  foreach collection_name in array private.example_collection_names(title) loop
    select c.id into collection
    from public.collections c
    where c.owner_id = target_owner and lower(c.name) = lower(collection_name);

    if collection is null then
      insert into public.collections (owner_id, name)
      values (target_owner, collection_name)
      returning id into collection;
    end if;

    insert into public.recipe_collections (recipe_id, collection_id)
    values (target_recipe, collection)
    on conflict do nothing;
  end loop;
end;
$$;

-- 1. Nouveaux comptes : chaque exemple créé est rangé aussitôt
create or replace function private.file_new_example()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.file_example_recipe(new.id, new.owner_id, new.title);
  return new;
end;
$$;

create trigger recipes_example_collections
  after insert on public.recipes
  for each row
  when (new.is_example)
  execute function private.file_new_example();

-- 2. Comptes existants qui ont encore leurs exemples
select private.file_example_recipe(r.id, r.owner_id, r.title)
from public.recipes r
where r.is_example;
