-- =============================================================================
-- Fonctionnalités réservées à certains comptes (« feature flags », décision 082)
--
-- Une ligne = une fonctionnalité activée pour un utilisateur. L'app n'affiche la
-- fonctionnalité que si la ligne existe pour la personne connectée.
-- Chacun lit SES lignes ; personne ne peut s'en ajouter depuis l'app : on les gère
-- par migration (ou à la main, sur la dev, pour tester).
-- =============================================================================

create table public.feature_flags (
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature ~ '^[a-z][a-z_]*$'),
  created_at timestamptz not null default now(),
  primary key (user_id, feature)
);
comment on table public.feature_flags is
  'Fonctionnalités activées pour un utilisateur (ex. print_shopping_list).';

alter table public.feature_flags enable row level security;

create policy "Voir mes fonctionnalités" on public.feature_flags
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.feature_flags from anon;
revoke insert, update, delete on public.feature_flags from authenticated;

-- « Imprimer la liste » (mode courses) : pour Anita. Sans effet si le compte
-- n'existe pas (cas de la dev).
insert into public.feature_flags (user_id, feature)
select u.id, 'print_shopping_list'
from auth.users u
where lower(u.email) = 'anita.geno@orange.fr'
on conflict do nothing;
