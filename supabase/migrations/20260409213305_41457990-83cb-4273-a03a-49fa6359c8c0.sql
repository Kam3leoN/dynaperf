
-- 1. Allow admins to delete any message (moderation)
CREATE POLICY "Admins can delete any message"
ON public.messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. App modules table
CREATE TABLE public.app_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read app_modules"
ON public.app_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage app_modules"
ON public.app_modules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_app_modules_updated_at
BEFORE UPDATE ON public.app_modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. User module overrides
CREATE TABLE public.user_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL REFERENCES public.app_modules(module_key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.user_module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own module overrides"
ON public.user_module_overrides FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all module overrides"
ON public.user_module_overrides FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_module_overrides_updated_at
BEFORE UPDATE ON public.user_module_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed default modules
INSERT INTO public.app_modules (module_key, label, sort_order) VALUES
  ('audits', 'Audits', 1),
  ('suivi', 'Suivi d''activité', 2),
  ('drive', 'Drive', 3),
  ('reseau', 'Réseau', 4),
  ('qrcode', 'QR Code', 5),
  ('messages_prives', 'Messages privés', 6),
  ('discussions', 'Discussions', 7);
