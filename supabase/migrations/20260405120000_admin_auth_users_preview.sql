-- Liste des comptes Auth (id, email) pour l’UI Admin si l’Edge Function listUsers renvoie vide.
-- Réservé aux utilisateurs avec rôle admin ou super_admin (via has_role).

CREATE OR REPLACE FUNCTION public.admin_auth_users_preview()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::text, u.created_at
  FROM auth.users u
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_auth_users_preview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_auth_users_preview() TO authenticated;
