
CREATE TABLE public.audit_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES public.audits(id) ON DELETE CASCADE NOT NULL,
  
  -- Step 0: General info
  partenaire_referent text,
  type_lieu text,
  heure_evenement text,
  nom_club text,
  nb_adherents integer,
  nb_invites integer,
  nb_no_show integer,
  nb_participants integer,
  nb_rdv_pris integer,
  
  -- 18 audit items stored as JSONB
  -- Each item: { score: number, comment?: string, checklist?: boolean[] }
  items jsonb NOT NULL DEFAULT '{}',
  
  -- Computed total
  total_points numeric,
  note_sur_10 numeric,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(audit_id)
);

ALTER TABLE public.audit_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit_details"
ON public.audit_details FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert audit_details"
ON public.audit_details FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update audit_details"
ON public.audit_details FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete audit_details"
ON public.audit_details FOR DELETE TO authenticated
USING (true);

CREATE TRIGGER update_audit_details_updated_at
  BEFORE UPDATE ON public.audit_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
