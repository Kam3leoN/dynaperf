
-- Sondages (polls) table
CREATE TABLE public.sondages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_multiple_choice BOOLEAN NOT NULL DEFAULT false,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sondage options (choices)
CREATE TABLE public.sondage_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sondage_id UUID NOT NULL REFERENCES public.sondages(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sondage votes
CREATE TABLE public.sondage_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sondage_id UUID NOT NULL REFERENCES public.sondages(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.sondage_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sondage_id, option_id, user_id)
);

-- Audit type custom fields (form builder)
CREATE TABLE public.audit_type_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_type_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for sondages
ALTER TABLE public.sondages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read sondages" ON public.sondages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create sondages" ON public.sondages FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update sondages" ON public.sondages FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator or admin can delete sondages" ON public.sondages FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- RLS for sondage_options
ALTER TABLE public.sondage_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read options" ON public.sondage_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creator can manage options" ON public.sondage_options FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sondages WHERE sondages.id = sondage_options.sondage_id AND sondages.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sondages WHERE sondages.id = sondage_options.sondage_id AND sondages.created_by = auth.uid())
);

-- RLS for sondage_votes
ALTER TABLE public.sondage_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read votes" ON public.sondage_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can vote" ON public.sondage_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON public.sondage_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for audit_type_custom_fields
ALTER TABLE public.audit_type_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read custom fields" ON public.audit_type_custom_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage custom fields" ON public.audit_type_custom_fields FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_sondages_updated_at BEFORE UPDATE ON public.sondages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_custom_fields_updated_at BEFORE UPDATE ON public.audit_type_custom_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime for sondages
ALTER PUBLICATION supabase_realtime ADD TABLE public.sondages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sondage_votes;
