-- Lien optionnel club → partenaire (président), pour compléter l’annuaire partenaires.
alter table public.clubs
  add column if not exists president_partenaire_id uuid references public.partenaires (id) on delete set null;

create index if not exists idx_clubs_president_partenaire_id on public.clubs (president_partenaire_id);

comment on column public.clubs.president_partenaire_id is 'Partenaire associé au président (email), synchronisé depuis l’admin.';
