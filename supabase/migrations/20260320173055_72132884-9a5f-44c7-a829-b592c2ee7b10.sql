
CREATE TABLE public.partenaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url text,
  prenom text NOT NULL DEFAULT '',
  nom text NOT NULL DEFAULT '',
  societe text NOT NULL DEFAULT '',
  commission numeric NOT NULL DEFAULT 0,
  partenaire_referent text NOT NULL DEFAULT 'Dynabuy',
  is_directeur_agence boolean NOT NULL DEFAULT false,
  is_president_club boolean NOT NULL DEFAULT false,
  is_cadre_externalise boolean NOT NULL DEFAULT false,
  pole_expertise text,
  secteurs text[] NOT NULL DEFAULT '{}',
  email text NOT NULL DEFAULT '',
  telephone text NOT NULL DEFAULT '',
  date_anniversaire date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partenaires"
  ON public.partenaires FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read partenaires"
  ON public.partenaires FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_partenaires_updated_at
  BEFORE UPDATE ON public.partenaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
