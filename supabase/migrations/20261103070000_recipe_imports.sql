-- =============================================================================
-- Lot 5 — Import d'une recette par photo (US-REC-02 ; SPEC §7, §9.2)
--
-- Chaque import est tracé : photo envoyée, statut, résultat de l'IA, modèle utilisé.
-- Utile pour réessayer, comparer Haiku / Sonnet et comprendre une mauvaise lecture.
-- La photo est dans l'espace de stockage recipe-photos, dans mon dossier.
-- =============================================================================

create table public.recipe_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  photo_path text not null,
  -- pending : envoyé à l'IA ; done : recette lue ; not_recipe : ce n'est pas une recette ;
  -- failed : IA indisponible ou réponse illisible (on peut réessayer)
  status text not null default 'pending' check (status in ('pending', 'done', 'not_recipe', 'failed')),
  result jsonb, -- recette extraite (format validé par l'application)
  model text, -- modèle IA utilisé (ex. claude-haiku-5-5)
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipe_imports_owner_id_idx on public.recipe_imports (owner_id, created_at desc);
comment on table public.recipe_imports is 'Imports de recettes par photo (IA) : suivi et résultat.';

create trigger recipe_imports_set_updated_at
  before update on public.recipe_imports
  for each row execute function public.set_updated_at();

alter table public.recipe_imports enable row level security;
create policy "Voir mes imports" on public.recipe_imports for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Créer mes imports" on public.recipe_imports for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    -- la photo doit être dans mon dossier
    and photo_path like (select auth.uid())::text || '/%'
  );
create policy "Modifier mes imports" on public.recipe_imports for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Supprimer mes imports" on public.recipe_imports for delete to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.recipe_imports from anon;
-- Le propriétaire et la photo d'un import ne changent pas
revoke update on public.recipe_imports from authenticated;
grant update (status, result, model, error) on public.recipe_imports to authenticated;
