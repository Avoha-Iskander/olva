-- =============================================================================
-- Lot 2.6 — Recettes d'exemple (US-CPT-02, décision 038)
--
-- Chaque nouvel utilisateur reçoit 4 recettes d'exemple (is_example = vrai),
-- supprimables d'un coup depuis « Mes recettes ».
-- Un exemple modifié devient une recette normale (il perd l'étiquette).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Écrit les 4 recettes d'exemple pour un utilisateur.
-- security definer : appelée depuis le déclencheur d'inscription, où personne
-- n'est encore connecté ; owner_id est donc renseigné explicitement.
-- Les ingrédients sont retrouvés par leur nom dans le catalogue commun ; un nom
-- introuvable est simplement ignoré (jamais d'erreur à l'inscription).
-- -----------------------------------------------------------------------------
create or replace function private.add_example_recipes(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipe_id uuid;
begin
  -- 1. Quiche lorraine
  insert into public.recipes (owner_id, title, servings, steps, is_example)
  values (target_user, 'Quiche lorraine', 6, array[
    'Préchauffer le four à 180 °C.',
    'Étaler la pâte dans un moule à tarte et la piquer avec une fourchette.',
    'Faire revenir les lardons à la poêle sans matière grasse, puis les égoutter.',
    'Battre les œufs avec la crème et le lait. Ajouter le gruyère, la muscade et le poivre.',
    'Répartir les lardons sur la pâte, verser l''appareil et enfourner 35 à 40 minutes.'
  ], true)
  returning id into v_recipe_id;

  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit, note)
  select v_recipe_id, v.position, i.id, v.quantity, v.unit, v.note
  from (values
    (1, 'Pâte brisée', 1::numeric, 'piece', null),
    (2, 'Lardons', 200, 'g', null),
    (3, 'Œuf', 3, 'piece', null),
    (4, 'Crème fraîche épaisse', 20, 'cl', null),
    (5, 'Lait entier', 10, 'cl', null),
    (6, 'Gruyère', 100, 'g', 'râpé'),
    (7, 'Muscade', null, null, null),
    (8, 'Poivre', null, null, null)
  ) as v (position, name, quantity, unit, note)
  join public.items i on i.owner_id is null and i.name = v.name;

  -- 2. Gratin dauphinois
  insert into public.recipes (owner_id, title, servings, steps, is_example)
  values (target_user, 'Gratin dauphinois', 4, array[
    'Préchauffer le four à 160 °C.',
    'Éplucher les pommes de terre et les couper en fines rondelles, sans les laver.',
    'Frotter un plat à gratin avec la gousse d''ail coupée en deux, puis le beurrer.',
    'Disposer les rondelles en couches, saler et poivrer entre chaque couche.',
    'Mélanger la crème et le lait, verser sur les pommes de terre et enfourner 1 h 15.'
  ], true)
  returning id into v_recipe_id;

  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit, note)
  select v_recipe_id, v.position, i.id, v.quantity, v.unit, v.note
  from (values
    (1, 'Pomme de terre', 1::numeric, 'kg', 'à chair ferme'),
    (2, 'Crème fraîche épaisse', 20, 'cl', null),
    (3, 'Lait entier', 25, 'cl', null),
    (4, 'Ail', 1, 'gousse', null),
    (5, 'Beurre doux', 10, 'g', 'pour le plat'),
    (6, 'Sel', null, null, null),
    (7, 'Poivre', null, null, null)
  ) as v (position, name, quantity, unit, note)
  join public.items i on i.owner_id is null and i.name = v.name;

  -- 3. Curry de poulet au lait de coco
  insert into public.recipes (owner_id, title, servings, steps, is_example)
  values (target_user, 'Curry de poulet au lait de coco', 4, array[
    'Couper le poulet en morceaux et émincer l''oignon.',
    'Faire revenir l''oignon dans l''huile, ajouter le poulet et le faire dorer.',
    'Ajouter le curry, mélanger, puis verser le lait de coco. Laisser mijoter 20 minutes.',
    'Pendant ce temps, faire cuire le riz.',
    'Servir avec la coriandre ciselée.'
  ], true)
  returning id into v_recipe_id;

  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit, note)
  select v_recipe_id, v.position, i.id, v.quantity, v.unit, v.note
  from (values
    (1, 'Blanc de poulet', 600::numeric, 'g', null),
    (2, 'Lait de coco', 40, 'cl', null),
    (3, 'Oignon', 1, 'piece', 'émincé'),
    (4, 'Curry', 2, 'cac', null),
    (5, 'Huile d''olive', 1, 'cas', null),
    (6, 'Riz basmati', 300, 'g', null),
    (7, 'Coriandre fraîche', null, null, 'pour servir'),
    (8, 'Sel', null, null, null)
  ) as v (position, name, quantity, unit, note)
  join public.items i on i.owner_id is null and i.name = v.name;

  -- 4. Crêpes
  insert into public.recipes (owner_id, title, servings, steps, is_example)
  values (target_user, 'Crêpes', 4, array[
    'Verser la farine dans un saladier, ajouter le sucre et le sel, puis creuser un puits.',
    'Ajouter les œufs et mélanger en versant le lait petit à petit pour éviter les grumeaux.',
    'Incorporer le beurre fondu et laisser reposer la pâte 1 heure.',
    'Cuire les crêpes dans une poêle chaude légèrement beurrée, environ 1 minute par face.'
  ], true)
  returning id into v_recipe_id;

  insert into public.recipe_ingredients (recipe_id, position, item_id, quantity, unit, note)
  select v_recipe_id, v.position, i.id, v.quantity, v.unit, v.note
  from (values
    (1, 'Farine', 250::numeric, 'g', null),
    (2, 'Œuf', 4, 'piece', null),
    (3, 'Lait entier', 50, 'cl', null),
    (4, 'Beurre doux', 50, 'g', 'fondu'),
    (5, 'Sucre en poudre', 1, 'cas', null),
    (6, 'Sel', 1, 'pincee', null)
  ) as v (position, name, quantity, unit, note)
  join public.items i on i.owner_id is null and i.name = v.name;
end;
$$;

-- Réservée au déclencheur et aux migrations : personne ne peut l'appeler via l'API
revoke all on function private.add_example_recipes(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Inscription : profil + recettes d'exemple.
-- Les exemples sont un bonus : s'ils échouent, l'inscription doit réussir quand même.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- Nom fourni par Google si disponible, sinon vide (demandé au parcours d'accueil)
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60)
  );

  begin
    perform private.add_example_recipes(new.id);
  exception when others then
    raise warning 'Recettes d''exemple non créées pour % : %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Comptes existants : ils reçoivent aussi les exemples (une seule fois)
-- -----------------------------------------------------------------------------
select private.add_example_recipes(u.id)
from auth.users u
where not exists (select 1 from public.recipes r where r.owner_id = u.id and r.is_example);

-- -----------------------------------------------------------------------------
-- save_recipe : un exemple modifié devient une recette normale
-- (« Supprimer les exemples » ne doit jamais effacer le travail de l'utilisateur)
-- -----------------------------------------------------------------------------
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
      thumb_path = recipe ->> 'thumb_path',
      is_example = false
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
