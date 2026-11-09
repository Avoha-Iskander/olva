-- =============================================================================
-- Lot 7quater — Tutoriel de prise en main (US-CPT-06, décision 071)
--
-- tutorial_status : vide = pas encore vu (le tutoriel se lance tout seul) ;
-- « completed » = suivi jusqu'au bout ; « skipped » = passé.
-- tutorial_step : dernière étape affichée (1 = bienvenue), pour savoir pendant la
-- phase de test où les gens s'arrêtent.
-- =============================================================================

alter table public.profiles
  add column tutorial_status text check (tutorial_status in ('completed', 'skipped')),
  add column tutorial_step smallint check (tutorial_step between 1 and 20);

comment on column public.profiles.tutorial_status is
  'Tutoriel : vide = pas vu, completed = terminé, skipped = passé.';
comment on column public.profiles.tutorial_step is
  'Tutoriel : dernière étape affichée (1 = bienvenue).';

-- Les profils n'autorisent la modification que de colonnes précises
grant update (tutorial_status, tutorial_step) on public.profiles to authenticated;
