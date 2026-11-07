-- =============================================================================
-- Lot 7ter — Mode clair ou sombre (US-CPT-05 ; décision 070)
--
-- Le choix est rangé dans le profil : il suit la personne d'un appareil à l'autre.
-- « system » (Automatique) suit le réglage du téléphone ; c'est la valeur par défaut.
-- Les règles d'accès existantes des profils s'appliquent (je ne modifie que le mien).
-- =============================================================================
alter table public.profiles
  add column theme text not null default 'system'
  check (theme in ('system', 'light', 'dark'));

comment on column public.profiles.theme is 'Apparence : system (suit le téléphone), light ou dark.';
