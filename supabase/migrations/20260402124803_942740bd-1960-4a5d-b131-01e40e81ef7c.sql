
CREATE TABLE public.drive_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.drive_categories(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read drive_categories" ON public.drive_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage drive_categories" ON public.drive_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_drive_categories_updated_at BEFORE UPDATE ON public.drive_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.drive_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.drive_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT DEFAULT '',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read drive_documents" ON public.drive_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage drive_documents" ON public.drive_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_drive_documents_updated_at BEFORE UPDATE ON public.drive_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('drive-files', 'drive-files', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated read drive files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'drive-files');
CREATE POLICY "Admins upload drive files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'drive-files' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete drive files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'drive-files' AND public.has_role(auth.uid(), 'admin'::app_role));
