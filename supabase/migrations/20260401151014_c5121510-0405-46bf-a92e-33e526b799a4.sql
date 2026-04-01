
ALTER TABLE public.collaborateur_config 
  ADD COLUMN prime_distanciel_1 numeric NOT NULL DEFAULT 0,
  ADD COLUMN prime_distanciel_2 numeric NOT NULL DEFAULT 0,
  ADD COLUMN prime_distanciel_3_plus numeric NOT NULL DEFAULT 0;
