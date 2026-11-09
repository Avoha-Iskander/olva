-- =============================================================================
-- Lot 7quater — Rayons : noms courts, emoji, Petit-déjeuner versé dans
-- Épicerie sucrée (US-CAT-06, décision 071)
--
-- Les rayons restent communs à tous les utilisateurs. On les retrouve par leur
-- NOM (et pas par leur numéro) : la migration donne le même résultat en dev et
-- en prod, même si les numéros différaient.
-- =============================================================================

-- 1. Un emoji devant chaque rayon (modifiable plus tard par une migration)
alter table public.aisles add column emoji text not null default '';
comment on column public.aisles.emoji is 'Emoji affiché devant le nom du rayon.';

-- 2. Petit-déjeuner → Épicerie sucrée : articles (communs et personnels) et
--    personnalisations (« mon rayon » pour un article commun), puis suppression
update public.items
set aisle_id = (select id from public.aisles where name = 'Épicerie sucrée et pâtisserie')
where aisle_id = (select id from public.aisles where name = 'Petit-déjeuner');

update public.item_overrides
set aisle_id = (select id from public.aisles where name = 'Épicerie sucrée et pâtisserie')
where aisle_id = (select id from public.aisles where name = 'Petit-déjeuner');

delete from public.aisles where name = 'Petit-déjeuner';

-- 3. Noms courts et emojis (« from (values …) » : une ligne par rayon)
update public.aisles a
set name = v.new_name, emoji = v.emoji
from (values
  ('Fruits et légumes',                         'Fruits et légumes',       '🥦'),
  ('Boulangerie',                               'Boulangerie',             '🥖'),
  ('Boucherie et volaille',                     'Boucherie',               '🥩'),
  ('Poissonnerie',                              'Poissonnerie',            '🐟'),
  ('Charcuterie et traiteur',                   'Charcuterie et traiteur', '🥓'),
  ('Crèmerie et œufs',                          'Crèmerie',                '🥛'),
  ('Fromages',                                  'Fromages',                '🧀'),
  ('Pâtes, riz et féculents',                   'Féculents',               '🍝'),
  ('Conserves et bocaux',                       'Conserves',               '🥫'),
  ('Huiles, vinaigres et condiments',           'Condiments',              '🫒'),
  ('Épices, herbes séchées et aides culinaires', 'Épices',                  '🧂'),
  ('Épicerie sucrée et pâtisserie',             'Épicerie sucrée',         '🍫'),
  ('Apéritif',                                  'Apéritif',                '🥨'),
  ('Surgelés',                                  'Surgelés',                '❄️'),
  ('Boissons',                                  'Boissons',                '🧃'),
  ('Bébé',                                      'Bébé',                    '🍼'),
  ('Hygiène et beauté',                         'Hygiène et beauté',       '🧴'),
  ('Entretien et maison',                       'Entretien',               '🧽'),
  ('Animalerie',                                'Animalerie',              '🐾'),
  ('Divers',                                    'Divers',                  '📦')
) as v (old_name, new_name, emoji)
where a.name = v.old_name;

-- 4. Ordre de parcours renuméroté de 1 à 20, sans trou
update public.aisles a
set position = ranked.n
from (select id, row_number() over (order by position) as n from public.aisles) ranked
where a.id = ranked.id;

-- 5. Garde-fou : la migration s'arrête si un rayon n'a pas été reconnu
do $$
begin
  if (select count(*) from public.aisles) <> 20 or exists (select 1 from public.aisles where emoji = '') then
    raise exception 'Rayons inattendus : vérifier les noms avant de relancer';
  end if;
end
$$;
