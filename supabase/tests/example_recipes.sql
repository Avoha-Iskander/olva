-- Test des recettes d'exemple (lot 2.6)
--
-- À exécuter sur olva-dev : Supabase → SQL Editor → coller → Run.
-- Crée deux utilisateurs fictifs (l'inscription leur donne les exemples), puis
-- vérifie la suppression des exemples, et ANNULE TOUT (le script se termine
-- volontairement par une « erreur » qui affiche les résultats).
-- Chaque ligne doit finir par « true ».

do $test$
declare
  r text[] := '{}';
  alex uuid := '00000000-0000-0000-0000-00000000000a';
  bob uuid := '00000000-0000-0000-0000-00000000000b';
  mine uuid := gen_random_uuid();
  quiche uuid;
  n int;
begin
  -- L'inscription déclenche la création du profil ET des exemples
  insert into auth.users (id, email, aud, role) values
    (alex, 'alex@test.local', 'authenticated', 'authenticated'),
    (bob, 'bob@test.local', 'authenticated', 'authenticated');
  select count(*) into n from public.recipes where owner_id = alex and is_example; r := r || ('4 exemples à l''inscription: ' || (n = 4));
  select count(*) into n from public.recipe_ingredients ri join public.recipes re on re.id = ri.recipe_id
    where re.owner_id = alex; r := r || ('29 ingrédients retrouvés dans le catalogue: ' || (n = 29));
  select count(*) into n from public.recipe_ingredients ri join public.recipes re on re.id = ri.recipe_id
    where re.owner_id = alex and re.title = 'Quiche lorraine' and ri.quantity is null; r := r || ('Quiche : 2 ingrédients au goût: ' || (n = 2));

  -- Alex se connecte
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', alex, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes; r := r || ('Alex ne voit que ses 4 exemples: ' || (n = 4));

  -- Un exemple modifié devient une recette normale
  select id into quiche from public.recipes where title = 'Quiche lorraine';
  perform public.save_recipe(jsonb_build_object(
    'id', quiche, 'title', 'Quiche lorraine de mamie', 'servings', 6, 'steps', jsonb_build_array('Cuire'),
    'ingredients', jsonb_build_array(), 'collection_ids', jsonb_build_array()));
  select count(*) into n from public.recipes where id = quiche and not is_example; r := r || ('Exemple modifié → recette normale: ' || (n = 1));

  -- Une recette personnelle
  perform public.save_recipe(jsonb_build_object(
    'id', mine, 'title', 'Ma soupe', 'servings', 2, 'steps', jsonb_build_array(),
    'ingredients', jsonb_build_array(), 'collection_ids', jsonb_build_array()));

  -- « Supprimer les exemples » (même requête que l'application)
  delete from public.recipes where is_example;
  select count(*) into n from public.recipes; r := r || ('Restent la quiche modifiée et ma soupe: ' || (n = 2));

  -- Les exemples de Bob ne sont pas touchés
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into n from public.recipes where is_example; r := r || ('Bob garde ses 4 exemples: ' || (n = 4));

  raise exception E'RÉSULTATS\n%', array_to_string(r, E'\n');
end
$test$;
