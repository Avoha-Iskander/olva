-- =============================================================================
-- Lot 2.1 — « Produit de placard » devient « ingrédient de base » (décision 035)
--
-- is_staple : ingrédient de base (huile, sel…), décoché par défaut dans la revue.
-- purchase_unit : unité de conditionnement à l'achat (ex. bouteille pour l'huile),
--   utilisée quand un ingrédient de base est coché.
-- =============================================================================

alter table public.items rename column is_pantry to is_staple;
comment on column public.items.is_staple is 'Ingrédient de base : décoché par défaut dans la revue des ingrédients.';

alter table public.items
  add column purchase_unit text references public.units (code),
  add constraint items_staple_needs_purchase_unit check (not is_staple or purchase_unit is not null);
comment on column public.items.purchase_unit is 'Unité de conditionnement à l''achat (obligatoire pour un ingrédient de base).';

create index items_purchase_unit_idx on public.items (purchase_unit);
