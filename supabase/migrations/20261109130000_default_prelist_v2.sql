-- =============================================================================
-- Lot 7quater — Nouvelle pré-liste par défaut (US-LST-03, décision 072)
--
-- Remplace la quinzaine d'articles de départ (décision 044) par la liste d'Alex.
-- Ne concerne que les comptes dont la pré-liste n'a pas encore été créée
-- (profiles.prelist_initialized = false) : les pré-listes existantes ne changent pas.
-- =============================================================================

-- 1. Deux articles génériques manquaient au catalogue commun
insert into public.items (name, aisle_id, default_unit, is_staple, purchase_unit)
select v.name, a.id, v.default_unit, false, null
from (values
  ('Pâtes', 'Féculents', 'g'),
  ('Chocolat', 'Épicerie sucrée', 'g')
) as v (name, aisle_name, default_unit)
join public.aisles a on a.name = v.aisle_name
on conflict do nothing;

-- 2. La fonction qui crée ma pré-liste la première fois, avec la nouvelle liste
create or replace function public.ensure_my_prelist()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;

  -- « for update » : deux appels simultanés ne créent pas la pré-liste deux fois
  if (select p.prelist_initialized from public.profiles p where p.id = current_user_id for update) then
    return;
  end if;

  insert into public.prelist_items (user_id, item_id, quantity, unit, position)
  select current_user_id, i.id, v.quantity, v.unit, v.position
  from (values
    -- Fruits et légumes
    (1, 'Banane', 6::numeric, 'piece'),
    (2, 'Pomme', 6, 'piece'),
    (3, 'Pomme de terre', 2, 'kg'),
    (4, 'Oignon', 4, 'piece'),
    (5, 'Salade', 1, 'piece'),
    -- Crèmerie et fromages
    (6, 'Lait', 2, 'l'),
    (7, 'Beurre', 250, 'g'),
    (8, 'Œuf', 6, 'piece'),
    (9, 'Yaourt', 4, 'piece'),
    (10, 'Fromage râpé', 200, 'g'),
    (11, 'Crème fraîche', 20, 'cl'),
    -- Boucherie, charcuterie et traiteur
    (12, 'Jambon', 4, 'tranche'),
    (13, 'Blanc de poulet', 500, 'g'),
    (14, 'Steak haché', 4, 'piece'),
    (15, 'Lardons', 200, 'g'),
    (16, 'Pâte feuilletée', 1, 'piece'),
    -- Boulangerie
    (17, 'Pain', 1, 'piece'),
    -- Épicerie salée
    (18, 'Pâtes', 500, 'g'),
    (19, 'Riz', 500, 'g'),
    (20, 'Sauce tomate cuisinée', 1, 'pot'),
    (21, 'Thon', 2, 'boite'),
    (22, 'Huile d''olive', 1, 'bouteille'),
    (23, 'Chips', 1, 'paquet'),
    -- Épicerie sucrée
    (24, 'Céréales', 1, 'paquet'),
    (25, 'Biscuits', 1, 'paquet'),
    (26, 'Chocolat', 200, 'g'),
    (27, 'Café moulu', 1, 'paquet'),
    -- Boissons
    (28, 'Eau', 6, 'bouteille'),
    (29, 'Jus multifruits', 1, 'bouteille'),
    -- Hygiène et entretien
    (30, 'Papier toilette', 1, 'paquet'),
    (31, 'Essuie-tout', 1, 'paquet'),
    (32, 'Liquide vaisselle', 1, 'bouteille'),
    (33, 'Lessive', 1, 'piece')
  ) as v (position, name, quantity, unit)
  join public.items i on i.owner_id is null and i.name = v.name
  on conflict do nothing;

  update public.profiles set prelist_initialized = true where id = current_user_id;
end;
$$;

-- 3. Garde-fou : chaque article de la liste existe bien au catalogue commun
do $$
declare
  missing text;
begin
  select string_agg(v.name, ', ') into missing
  from (values ('Banane'), ('Pomme'), ('Pomme de terre'), ('Oignon'), ('Salade'), ('Lait'),
    ('Beurre'), ('Œuf'), ('Yaourt'), ('Fromage râpé'), ('Crème fraîche'), ('Jambon'),
    ('Blanc de poulet'), ('Steak haché'), ('Lardons'), ('Pâte feuilletée'), ('Pain'), ('Pâtes'),
    ('Riz'), ('Sauce tomate cuisinée'), ('Thon'), ('Huile d''olive'), ('Chips'), ('Céréales'),
    ('Biscuits'), ('Chocolat'), ('Café moulu'), ('Eau'), ('Jus multifruits'), ('Papier toilette'),
    ('Essuie-tout'), ('Liquide vaisselle'), ('Lessive')) as v (name)
  where not exists (select 1 from public.items i where i.owner_id is null and i.name = v.name);
  if missing is not null then
    raise exception 'Articles absents du catalogue : %', missing;
  end if;
end
$$;
