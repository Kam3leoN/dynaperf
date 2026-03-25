
ALTER TABLE public.collaborateur_config ADD COLUMN IF NOT EXISTS semaines_indisponibles integer NOT NULL DEFAULT 10;

ALTER TABLE public.secteurs ADD COLUMN IF NOT EXISTS departements text[] NOT NULL DEFAULT '{}'::text[];
