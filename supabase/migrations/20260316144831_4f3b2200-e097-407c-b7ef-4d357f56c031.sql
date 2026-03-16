
-- Create audits table
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  partenaire TEXT NOT NULL,
  lieu TEXT DEFAULT '',
  auditeur TEXT NOT NULL,
  type_evenement TEXT NOT NULL,
  note NUMERIC(5,2),
  mois_versement TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'NON' CHECK (statut IN ('OK', 'NON')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Public access (no auth for now)
CREATE POLICY "Allow public read" ON public.audits FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.audits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.audits FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.audits FOR DELETE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_audits_updated_at
BEFORE UPDATE ON public.audits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
