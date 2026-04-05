-- Rôle standard « Utilisateur » = enum member (libellé UI uniquement).
-- Bascule tous les comptes encore en lecteur / user / redacteur vers member,
-- supprime les lignes associées dans role_permission_defaults et staff_role_rank.
-- Les littéraux d’enum PostgreSQL peuvent rester (inertes) tant que la version < 18.

UPDATE public.user_roles
SET role = 'member'::public.app_role
WHERE role::text IN ('lecteur', 'user', 'redacteur');

DELETE FROM public.role_permission_defaults
WHERE role::text IN ('lecteur', 'user', 'redacteur');

DELETE FROM public.staff_role_rank
WHERE role::text IN ('lecteur', 'user', 'redacteur');

-- Seed des défauts : uniquement les rôles encore utilisés (plus d’enum_range sur les hérités).
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
  FROM unnest(
    ARRAY[
      'super_admin'::public.app_role,
      'admin'::public.app_role,
      'super_moderator'::public.app_role,
      'moderator'::public.app_role,
      'bot'::public.app_role,
      'member'::public.app_role
    ]
  ) AS r
  ON CONFLICT (role, permission_key) DO NOTHING;
END;
$$;
