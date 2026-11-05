-- US-CAT-05 (3/3) — poids moyens par pièce et synonymes personnels (décision 059)

-- -----------------------------------------------------------------------------
-- 1. Poids moyens : « 1 pièce de carotte = 100 g », « 1 tranche de jarret = 250 g »…
--    Une seule règle par article suffit : l'app convertit dans les deux sens.
--    Le nom de l'article doit exister : sinon la ligne est simplement ignorée (jointure).
--    « on conflict do nothing » : si la conversion existe déjà, on ne la touche pas.
-- -----------------------------------------------------------------------------
insert into public.unit_conversions (item_id, from_unit, to_unit, factor)
select i.id, v.from_unit, v.to_unit, v.factor
from (values
  ('Abricot', 'piece', 'g', 45),
  ('Ananas', 'piece', 'g', 1000),
  ('Artichaut', 'piece', 'g', 300),
  ('Avocat', 'piece', 'g', 200),
  ('Banane', 'piece', 'g', 120),
  ('Banane plantain', 'piece', 'g', 250),
  ('Betterave cuite', 'piece', 'g', 150),
  ('Brocoli', 'piece', 'g', 400),
  ('Butternut', 'piece', 'g', 1200),
  ('Céleri-rave', 'piece', 'g', 800),
  ('Champignon de Paris', 'piece', 'g', 20),
  ('Chou blanc', 'piece', 'g', 1200),
  ('Chou rouge', 'piece', 'g', 1200),
  ('Chou vert', 'piece', 'g', 1000),
  ('Chou-fleur', 'piece', 'g', 1000),
  ('Chou romanesco', 'piece', 'g', 600),
  ('Clémentine', 'piece', 'g', 70),
  ('Concombre', 'piece', 'g', 350),
  ('Courge spaghetti', 'piece', 'g', 1500),
  ('Endive', 'piece', 'g', 120),
  ('Épi de maïs', 'piece', 'g', 250),
  ('Fenouil', 'piece', 'g', 250),
  ('Figue', 'piece', 'g', 50),
  ('Kiwi', 'piece', 'g', 80),
  ('Mandarine', 'piece', 'g', 70),
  ('Mangue', 'piece', 'g', 350),
  ('Melon', 'piece', 'g', 1000),
  ('Navet', 'piece', 'g', 150),
  ('Nectarine', 'piece', 'g', 150),
  ('Oignon grelot', 'piece', 'g', 15),
  ('Oignon rouge', 'piece', 'g', 100),
  ('Orange', 'piece', 'g', 200),
  ('Pamplemousse', 'piece', 'g', 350),
  ('Panais', 'piece', 'g', 150),
  ('Patate douce', 'piece', 'g', 300),
  ('Pêche', 'piece', 'g', 150),
  ('Piment rouge', 'piece', 'g', 10),
  ('Poire', 'piece', 'g', 170),
  ('Poivron jaune', 'piece', 'g', 150),
  ('Poivron orange', 'piece', 'g', 150),
  ('Poivron vert', 'piece', 'g', 150),
  ('Pomme de terre grenaille', 'piece', 'g', 40),
  ('Potimarron', 'piece', 'g', 1200),
  ('Prune', 'piece', 'g', 40),
  ('Radis noir', 'piece', 'g', 250),
  ('Tomate cerise', 'piece', 'g', 15),
  ('Tomate cœur de bœuf', 'piece', 'g', 300),
  ('Bavette', 'piece', 'g', 150),
  ('Blanc de poulet', 'piece', 'g', 150),
  ('Chipolata', 'piece', 'g', 50),
  ('Côte de porc', 'piece', 'g', 200),
  ('Côte de veau', 'piece', 'g', 300),
  ('Côtelette d''agneau', 'piece', 'g', 80),
  ('Cuisse de canard', 'piece', 'g', 300),
  ('Cuisse de poulet', 'piece', 'g', 250),
  ('Entrecôte', 'piece', 'g', 300),
  ('Escalope de dinde', 'piece', 'g', 120),
  ('Escalope de veau', 'piece', 'g', 120),
  ('Faux-filet', 'piece', 'g', 200),
  ('Filet mignon de porc', 'piece', 'g', 500),
  ('Haut de cuisse de poulet', 'piece', 'g', 150),
  ('Jarret de veau', 'tranche', 'g', 250),
  ('Joue de bœuf', 'piece', 'g', 300),
  ('Lapin', 'piece', 'g', 1500),
  ('Magret de canard', 'piece', 'g', 350),
  ('Merguez', 'piece', 'g', 60),
  ('Onglet', 'piece', 'g', 150),
  ('Pilon de poulet', 'piece', 'g', 100),
  ('Pintade', 'piece', 'g', 1300),
  ('Poulet entier', 'piece', 'g', 1500),
  ('Saucisse de Toulouse', 'piece', 'g', 120),
  ('Souris d''agneau', 'piece', 'g', 350),
  ('Steak de bœuf', 'piece', 'g', 150),
  ('Steak haché', 'piece', 'g', 100),
  ('Bar', 'piece', 'g', 400),
  ('Cabillaud', 'piece', 'g', 150),
  ('Dorade', 'piece', 'g', 400),
  ('Gambas', 'piece', 'g', 30),
  ('Maquereau', 'piece', 'g', 300),
  ('Noix de Saint-Jacques', 'piece', 'g', 25),
  ('Sardine fraîche', 'piece', 'g', 50),
  ('Saumon', 'piece', 'g', 125),
  ('Sole', 'piece', 'g', 300),
  ('Truite fumée', 'tranche', 'g', 25),
  ('Bacon', 'tranche', 'g', 15),
  ('Blanc de dinde', 'tranche', 'g', 30),
  ('Jambon cru', 'tranche', 'g', 15),
  ('Pancetta', 'tranche', 'g', 10),
  ('Poitrine fumée', 'tranche', 'g', 25),
  ('Pâte sablée', 'piece', 'g', 230),
  ('Pâte à pizza', 'piece', 'g', 260),
  ('Yaourt', 'piece', 'g', 125),
  ('Petit-suisse', 'piece', 'g', 60),
  ('Burrata', 'piece', 'g', 125),
  ('Feta', 'piece', 'g', 200),
  ('Reblochon', 'piece', 'g', 450),
  ('Saint-Marcellin', 'piece', 'g', 80),
  ('Mascarpone', 'pot', 'g', 250),
  ('Ricotta', 'pot', 'g', 250),
  ('Baguette', 'piece', 'g', 250),
  ('Pain de mie', 'tranche', 'g', 25)
) as v (name, from_unit, to_unit, factor)
join public.items i on i.name = v.name and i.owner_id is null
on conflict (item_id, from_unit, to_unit) where owner_id is null do nothing;

-- -----------------------------------------------------------------------------
-- 2. Mes synonymes : « huile » → mon article « Huile de tournesol ».
--    Appris quand je corrige l'article d'un ingrédient importé ; propres à chacun
--    (la table item_aliases, elle, est commune à tous).
-- -----------------------------------------------------------------------------
create table public.my_item_aliases (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  alias text not null check (alias = lower(trim(alias)) and alias <> ''),
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, alias)
);
create index my_item_aliases_item_id_idx on public.my_item_aliases (item_id);
comment on table public.my_item_aliases is
  'Synonymes personnels : mot lu dans une recette importée → article choisi par l''utilisateur.';

alter table public.my_item_aliases enable row level security;

-- Chacun ne voit et ne gère que ses synonymes
create policy "Voir mes synonymes"
  on public.my_item_aliases for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Créer mes synonymes"
  on public.my_item_aliases for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Modifier mes synonymes"
  on public.my_item_aliases for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Supprimer mes synonymes"
  on public.my_item_aliases for delete to authenticated
  using (owner_id = (select auth.uid()));
