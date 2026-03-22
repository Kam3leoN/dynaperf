
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  format text NOT NULL DEFAULT 'Développement',
  president_nom text NOT NULL DEFAULT '',
  vice_president_nom text,
  agence_rattachement text,
  agence_mere text,
  telephone_president text,
  telephone_vice_president text,
  email_president text,
  adresse text,
  departement text,
  statut text NOT NULL DEFAULT 'Actif',
  nb_membres_actifs integer NOT NULL DEFAULT 0,
  nb_leads_transformes integer NOT NULL DEFAULT 0,
  montant_ca numeric NOT NULL DEFAULT 0,
  date_creation date,
  date_desactivation date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage clubs" ON public.clubs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read clubs" ON public.clubs FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
