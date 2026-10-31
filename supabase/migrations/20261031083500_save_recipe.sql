-- =============================================================================
-- Lot 2.4 — Enregistrement d'une recette en un seul bloc (US-REC-01)
--
-- Enregistre la recette, ses ingrédients et ses collections dans une même
-- transaction : tout réussit ou rien n'est modifié.
-- « security invoker » : les règles d'accès s'appliquent (on ne peut créer ou
-- modifier que ses propres recettes, avec ses propres collections).
--
-- Format attendu (jsonb) :
-- { "id": uuid, "title", "servings", "steps": [texte], "book_title", "book_page",
--   "photo_path", "thumb_path",
--   "ingredients": [{ "item_id", "quantity", "unit", "note" }],
--   "collection_ids": [uuid] }
-- =============================================================================

create or replace function public.save_recipe(recipe jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recipe_id uuid := (recipe ->> 'id')::uuid;
begin
  if recipe_id is null then
    raise exception 'Identifiant de recette manquant';
  end if;

  if exists (select 1 from public.recipes where id = recipe_id) then
    update public.recipes set
      title = recipe ->> 'title',
      servings = (recipe ->> 'servings')::integer,
      steps = coalesce(array(select jsonb_array_elements_text(recipe -> 'steps')), '{}'),
      book_title = nullif(recipe ->> 'book_title', ''),
      book_page = (recipe ->> 'book_page')::integer,
      photo_path = recipe ->> 'photo_path',
      thumb_path = recipe ->> 'thumb_path'
    where id = recipe_id;
    if not found then
      raise exception 'Recette introuvable ou non modifiable';
    end if;
  else
    insert into public.recipes (id, title, servings, steps, book_title, book_page, photo_path, thumb_path)
    values (
      recipe_id,
      recipe ->> 'title',
      (recipe ->> 'servings')::integer,
      coalesce(array(select jsonb_array_elements_text(recipe -> 'steps')), '{}'),
      nullif(recipe ->> 'book_title', ''),
      (recipe ->> 'book_page')::integer,
      recipe ->> 'photo_path',
      recipe ->> 'thumb_path'
    );
  end if;

  -- Ingrédients : on remplace la liste complète, dans l'ordre reçu
  delete from public.recipe_ingredients where recipe_ingredients.recipe_id = save_recipe.recipe_id;
  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit, note)
  select
    save_recipe.recipe_id,
    i.ordinality::smallint,
    (i.value ->> 'item_id')::uuid,
    (i.value ->> 'quantity')::numeric,
    i.value ->> 'unit',
    nullif(i.value ->> 'note', '')
  from jsonb_array_elements(coalesce(recipe -> 'ingredients', '[]'::jsonb)) with ordinality as i (value, ordinality);

  -- Collections : on remplace aussi la liste complète
  delete from public.recipe_collections where recipe_collections.recipe_id = save_recipe.recipe_id;
  insert into public.recipe_collections (recipe_id, collection_id)
  select save_recipe.recipe_id, c.value::uuid
  from jsonb_array_elements_text(coalesce(recipe -> 'collection_ids', '[]'::jsonb)) as c (value);

  return recipe_id;
end;
$$;

revoke all on function public.save_recipe(jsonb) from public, anon;
grant execute on function public.save_recipe(jsonb) to authenticated;
