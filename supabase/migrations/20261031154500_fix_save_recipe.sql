-- =============================================================================
-- Correctif — save_recipe : référence invalide à une variable locale
--
-- La version précédente écrivait « save_recipe.recipe_id » : en PL/pgSQL, cette
-- notation ne désigne que les PARAMÈTRES de la fonction, pas ses variables
-- locales → erreur « missing FROM-clause entry for table save_recipe ».
-- La variable est renommée (v_recipe_id) pour lever toute ambiguïté avec la
-- colonne recipe_id des tables.
-- =============================================================================

create or replace function public.save_recipe(recipe jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe_id uuid := (recipe ->> 'id')::uuid;
begin
  if v_recipe_id is null then
    raise exception 'Identifiant de recette manquant';
  end if;

  if exists (select 1 from public.recipes r where r.id = v_recipe_id) then
    update public.recipes set
      title = recipe ->> 'title',
      servings = (recipe ->> 'servings')::integer,
      steps = coalesce(array(select jsonb_array_elements_text(recipe -> 'steps')), '{}'),
      book_title = nullif(recipe ->> 'book_title', ''),
      book_page = (recipe ->> 'book_page')::integer,
      photo_path = recipe ->> 'photo_path',
      thumb_path = recipe ->> 'thumb_path'
    where id = v_recipe_id;
    if not found then
      raise exception 'Recette introuvable ou non modifiable';
    end if;
  else
    insert into public.recipes (id, title, servings, steps, book_title, book_page, photo_path, thumb_path)
    values (
      v_recipe_id,
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
  delete from public.recipe_ingredients ri where ri.recipe_id = v_recipe_id;
  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit, note)
  select
    v_recipe_id,
    i.ordinality::smallint,
    (i.value ->> 'item_id')::uuid,
    (i.value ->> 'quantity')::numeric,
    i.value ->> 'unit',
    nullif(i.value ->> 'note', '')
  from jsonb_array_elements(coalesce(recipe -> 'ingredients', '[]'::jsonb)) with ordinality as i (value, ordinality);

  -- Collections : on remplace aussi la liste complète
  delete from public.recipe_collections rc where rc.recipe_id = v_recipe_id;
  insert into public.recipe_collections (recipe_id, collection_id)
  select v_recipe_id, c.value::uuid
  from jsonb_array_elements_text(coalesce(recipe -> 'collection_ids', '[]'::jsonb)) as c (value);

  return v_recipe_id;
end;
$$;
