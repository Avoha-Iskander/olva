-- =============================================================================
-- Trace des échecs d'import survenus SUR LE TÉLÉPHONE (correctif, Android 10)
--
-- Jusqu'ici, un import n'existait dans recipe_imports qu'une fois les photos envoyées
-- (ou le lien, ou le texte, reçus par le serveur). Si le téléphone écartait le fichier
-- ou n'arrivait pas à le compresser / l'envoyer, il ne restait AUCUNE trace.
-- On accepte désormais une ligne « failed » sans source : sa colonne error dit ce qui
-- s'est passé (ex. « Fichier écarté : type vide, nom .png ») et sur quel appareil.
-- Elle est écrite par l'action serveur recordClientImportFailure.
-- =============================================================================

alter table public.recipe_imports
  drop constraint recipe_imports_source_check,
  add constraint recipe_imports_source_check check (
    (photo_paths is not null and cardinality(photo_paths) between 1 and 3
      and source_url is null and not pasted_text)
    or (photo_paths is null and source_url is not null and not pasted_text)
    or (photo_paths is null and source_url is null and pasted_text)
    -- Échec côté téléphone, avant tout envoi : pas de source, seulement la raison
    or (photo_paths is null and source_url is null and not pasted_text
      and status = 'failed' and error is not null)
  );
