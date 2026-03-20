
-- Audit types reference
CREATE TABLE public.audit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the 4 types
INSERT INTO public.audit_types (key, label, color, icon) VALUES
  ('RD Présentiel', 'Rencontre Dirigeants Présentiel', '#ee4540', 'faUsers'),
  ('RD Distanciel', 'Rencontre Dirigeants Distanciel', '#234653', 'faLaptop'),
  ('Club Affaires', 'Club d''Affaires', '#ffbd23', 'faBriefcase'),
  ('RDV Commercial', 'Rendez-Vous Commercial', '#5dbcb9', 'faHandshake');

-- Categories per audit type
CREATE TABLE public.audit_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type_id uuid REFERENCES public.audit_types(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Items per category
CREATE TABLE public.audit_items_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.audit_categories(id) ON DELETE CASCADE NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  max_points integer NOT NULL DEFAULT 1,
  condition text NOT NULL DEFAULT '',
  scoring_rules text,
  input_type text NOT NULL DEFAULT 'boolean',
  checklist_items jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.audit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items_config ENABLE ROW LEVEL SECURITY;

-- Read for all authenticated
CREATE POLICY "Authenticated read audit_types" ON public.audit_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read audit_categories" ON public.audit_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read audit_items_config" ON public.audit_items_config FOR SELECT TO authenticated USING (true);

-- Admin write
CREATE POLICY "Admins manage audit_types" ON public.audit_types FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage audit_categories" ON public.audit_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage audit_items_config" ON public.audit_items_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Triggers
CREATE TRIGGER update_audit_types_updated_at BEFORE UPDATE ON public.audit_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audit_categories_updated_at BEFORE UPDATE ON public.audit_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audit_items_config_updated_at BEFORE UPDATE ON public.audit_items_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
