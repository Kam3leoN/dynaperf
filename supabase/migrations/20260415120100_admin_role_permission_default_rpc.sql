-- Écritures sur role_permission_defaults via RPC (SECURITY DEFINER) : contourne la RLS
-- et évite les erreurs client « new row violates row-level security policy ».
-- (Timestamp 20260415120100 pour ne pas entrer en conflit avec 20260415120000_message_reactions_pins.)

CREATE OR REPLACE FUNCTION public.admin_set_role_permission_default(
  p_role public.app_role,
  p_permission_key text,
  p_allowed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier les droits par rôle';
  END IF;

  INSERT INTO public.role_permission_defaults (role, permission_key, allowed)
  VALUES (p_role, p_permission_key, p_allowed)
  ON CONFLICT (role, permission_key) DO UPDATE SET allowed = EXCLUDED.allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_role_permission_default(public.app_role, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_role_permission_default(public.app_role, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_seed_role_permission_defaults_for_key(p_permission_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier les droits par rôle';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.app_permissions ap WHERE ap.key = p_permission_key) THEN
    RAISE EXCEPTION 'Permission inconnue';
  END IF;

  INSERT INTO public.role_permission_defaults (role, permission_key, allowed)
  SELECT r, p_permission_key, false
  FROM unnest(enum_range(NULL::public.app_role)) AS r
  ON CONFLICT (role, permission_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_seed_role_permission_defaults_for_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_seed_role_permission_defaults_for_key(text) TO authenticated;
