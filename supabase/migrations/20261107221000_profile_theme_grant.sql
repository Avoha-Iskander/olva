-- =============================================================================
-- Lot 7ter — Mode clair ou sombre (US-CPT-05) : droit de modifier la colonne theme
--
-- Les profils n'autorisent la modification que de colonnes précises (migration des
-- profils) : la nouvelle colonne theme doit y être ajoutée.
-- =============================================================================
grant update (theme) on public.profiles to authenticated;
