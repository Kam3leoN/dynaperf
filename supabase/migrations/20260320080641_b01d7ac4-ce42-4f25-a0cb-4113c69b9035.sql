
CREATE TABLE public.collaborateur_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objectif integer NOT NULL DEFAULT 0,
  palier_1 integer DEFAULT NULL,
  palier_2 integer DEFAULT NULL,
  palier_3 integer DEFAULT NULL,
  prime_audit_1 numeric NOT NULL DEFAULT 0,
  prime_audit_2 numeric NOT NULL DEFAULT 0,
  prime_audit_3_plus numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.collaborateur_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all configs" ON public.collaborateur_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own config" ON public.collaborateur_config
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_collaborateur_config_updated_at
  BEFORE UPDATE ON public.collaborateur_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
