
ALTER TABLE public.partenaires 
  ADD COLUMN statut text NOT NULL DEFAULT 'actif',
  ALTER COLUMN commission SET DEFAULT 50;

UPDATE public.partenaires SET commission = 50 WHERE commission = 0;
