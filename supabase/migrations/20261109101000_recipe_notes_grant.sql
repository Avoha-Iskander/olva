-- =============================================================================
-- Lot 7quater — Notes d'une recette (US-REC-08) : droit de modification
--
-- Sur `recipes`, les utilisateurs ne peuvent modifier que des colonnes listées
-- une à une (le propriétaire, l'indicateur « exemple »… restent protégés).
-- La nouvelle colonne `notes` doit donc être ajoutée à cette liste.
-- La règle d'accès (RLS) limite toujours la modification au propriétaire.
-- =============================================================================

grant update (notes) on public.recipes to authenticated;
