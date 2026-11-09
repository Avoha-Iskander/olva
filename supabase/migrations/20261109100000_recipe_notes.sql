-- =============================================================================
-- Lot 7quater — Notes d'une recette (US-REC-08, décision 071)
--
-- Une colonne de texte libre, affichée après les étapes. Les règles d'accès
-- (RLS) de `recipes` s'appliquent telles quelles : seul le propriétaire modifie,
-- les personnes à qui la recette est partagée lisent.
-- =============================================================================

alter table public.recipes
  add column notes text
  check (notes is null or char_length(notes) <= 2000);

comment on column public.recipes.notes is
  'Notes libres de la recette (astuces, variantes), affichées après les étapes.';

-- Copier une recette partagée (US-REC-06) : la copie garde aussi les notes.
-- Seule la ligne « insert into public.recipes » change par rapport à la version
-- du lot 2.8 (20261101100000_copy_recipe.sql).
create or replace function public.copy_recipe(source uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  src public.recipes;
  new_recipe_id uuid;
  ingredient record;
  target_item uuid;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  select * into src from public.recipes where id = source;
  if src.id is null then
    raise exception 'Recette introuvable';
  end if;
  if src.owner_id = current_user_id then
    raise exception 'Cette recette est déjà à vous';
  end if;

  select r.id into new_recipe_id
  from public.recipes r
  where r.owner_id = current_user_id and r.copied_from = source
  limit 1;
  if new_recipe_id is not null then
    return new_recipe_id;
  end if;

  insert into public.recipes (title, servings, steps, notes, book_title, book_page, copied_from)
  values (src.title, src.servings, src.steps, src.notes, src.book_title, src.book_page, src.id)
  returning id into new_recipe_id;

  for ingredient in
    select ri.position, ri.item_id, ri.quantity, ri.unit, ri.note,
           i.owner_id as item_owner, i.name, i.aisle_id, i.default_unit, i.is_staple, i.purchase_unit
    from public.recipe_ingredients ri
    join public.items i on i.id = ri.item_id
    where ri.recipe_id = source
    order by ri.position
  loop
    if ingredient.item_owner is null or ingredient.item_owner = current_user_id then
      target_item := ingredient.item_id;
    else
      select i.id into target_item
      from public.items i
      where i.owner_id = current_user_id and lower(i.name) = lower(ingredient.name);

      if target_item is null then
        insert into public.items (owner_id, name, aisle_id, default_unit, is_staple, purchase_unit)
        values (current_user_id, ingredient.name, ingredient.aisle_id, ingredient.default_unit,
                ingredient.is_staple, ingredient.purchase_unit)
        returning id into target_item;

        insert into public.unit_conversions (item_id, owner_id, from_unit, to_unit, factor)
        select target_item, current_user_id, c.from_unit, c.to_unit, c.factor
        from public.unit_conversions c
        where c.item_id = ingredient.item_id and c.owner_id = ingredient.item_owner;
      end if;
    end if;

    insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit, note)
    values (new_recipe_id, ingredient.position, target_item, ingredient.quantity, ingredient.unit, ingredient.note);
  end loop;

  return new_recipe_id;
end;
$$;

revoke all on function public.copy_recipe(uuid) from public, anon;
grant execute on function public.copy_recipe(uuid) to authenticated;
