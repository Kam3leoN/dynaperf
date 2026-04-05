-- Titres organisationnels (badges) : enum + colonne profiles.org_titles[]

CREATE TYPE public.org_title AS ENUM (
  'owner',
  'boss',
  'director_general',
  'external_executive',
  'agency',
  'president'
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_titles public.org_title[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.org_titles IS
  'Titres métier (Owner, Boss, etc.) ; édition réservée admin/super_admin via politiques profiles existantes.';
