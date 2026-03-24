
-- Create secteurs table
CREATE TABLE public.secteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.secteurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage secteurs" ON public.secteurs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read secteurs" ON public.secteurs FOR SELECT TO authenticated
  USING (true);

-- Add secteur_id to clubs
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS secteur_id uuid REFERENCES public.secteurs(id) ON DELETE SET NULL;

-- Add lat/lng to clubs for map
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS longitude double precision;

-- Seed two sectors
INSERT INTO public.secteurs (nom) VALUES ('Secteur Cédric'), ('Secteur Geoffroy');
