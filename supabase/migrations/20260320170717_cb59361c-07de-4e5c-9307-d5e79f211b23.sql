
CREATE TABLE public.french_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  postal_code text NOT NULL,
  department text,
  region text
);

ALTER TABLE public.french_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read cities"
  ON public.french_cities FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_french_cities_name ON public.french_cities (name);
CREATE INDEX idx_french_cities_postal_code ON public.french_cities (postal_code);
