-- =============================================================================
-- Lot 2.8 — Copier une recette partagée (US-REC-06, décision 040)
--
-- Crée une copie indépendante, qui m'appartient, d'une recette qu'on me partage.
-- Les articles personnels de l'autre personne sont rattachés à MON catalogue :
-- mon article du même nom s'il existe, sinon une copie (avec ses conversions).
-- La photo est copiée ensuite par l'application (espace de stockage).
-- =============================================================================

create or replace function public.copy_recipe(source uuid)
returns uuid
language plpgsql
-- security invoker : la fonction a MES droits. Je ne peux donc copier que ce
-- que je peux lire, et je ne peux écrire que dans mes propres données.
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

  -- Les règles d'accès ne renvoient la recette que si elle m'est partagée (ou à moi)
  select * into src from public.recipes where id = source;
  if src.id is null then
    raise exception 'Recette introuvable';
  end if;
  if src.owner_id = current_user_id then
    raise exception 'Cette recette est déjà à vous';
  end if;

  -- Déjà copiée : on renvoie la copie existante plutôt que d'en créer une deuxième
  select r.id into new_recipe_id
  from public.recipes r
  where r.owner_id = current_user_id and r.copied_from = source
  limit 1;
  if new_recipe_id is not null then
    return new_recipe_id;
  end if;

  insert into public.recipes (title, servings, steps, book_title, book_page, copied_from)
  values (src.title, src.servings, src.steps, src.book_title, src.book_page, src.id)
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
      -- Article du catalogue commun (ou déjà à moi) : on le garde tel quel
      target_item := ingredient.item_id;
    else
      -- Article personnel de l'autre personne : mon article du même nom…
      select i.id into target_item
      from public.items i
      where i.owner_id = current_user_id and lower(i.name) = lower(ingredient.name);

      -- … sinon une copie dans mon catalogue personnel, avec ses conversions
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
