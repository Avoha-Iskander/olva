-- =============================================================================
-- Recettes d'exemple illustrées (US-CPT-02, décision 075)
--
-- Les 4 photos sont rangées dans l'app (dossier public/exemples/), communes à tous :
-- en base, leur chemin commence par « exemples/ » et l'app les affiche directement.
-- =============================================================================

-- Photo de chaque exemple, d'après son titre (null = pas de photo prévue)
create or replace function private.example_photo_name(title text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case title
    when 'Quiche lorraine' then 'quiche-lorraine'
    when 'Gratin dauphinois' then 'gratin-dauphinois'
    when 'Curry de poulet au lait de coco' then 'curry-poulet-coco'
    when 'Crêpes' then 'crepes'
  end
$$;

-- 1. Nouveaux comptes : un déclencheur ajoute la photo à chaque exemple créé, sans
--    toucher à la fonction qui écrit les exemples (add_example_recipes)
create or replace function private.set_example_photo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  name text := private.example_photo_name(new.title);
begin
  if name is not null then
    new.photo_path := 'exemples/' || name || '.webp';
    new.thumb_path := 'exemples/' || name || '-thumb.webp';
  end if;
  return new;
end;
$$;

create trigger recipes_example_photo
  before insert on public.recipes
  for each row
  when (new.is_example and new.photo_path is null)
  execute function private.set_example_photo();

-- 2. Exemples déjà créés, encore sans photo
update public.recipes
set photo_path = 'exemples/' || private.example_photo_name(title) || '.webp',
    thumb_path = 'exemples/' || private.example_photo_name(title) || '-thumb.webp'
where is_example
  and photo_path is null
  and private.example_photo_name(title) is not null;
