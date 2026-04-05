-- Un admin ne peut pas supprimer un rôle dont le sort_rank est strictement supérieur au sien.
-- Les super_admin restent sans cette limite.

CREATE OR REPLACE FUNCTION public.admin_delete_staff_role(p_role_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_deleted_rank int;
  v_fallback text;
  v_remaining int;
  v_caller_rank int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Interdit';
  END IF;

  SELECT c.sort_rank INTO v_deleted_rank
  FROM public.app_roles_catalog c
  WHERE c.role_key = p_role_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rôle inconnu';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  ) THEN
    SELECT c.sort_rank INTO v_caller_rank
    FROM public.user_roles ur
    JOIN public.app_roles_catalog c ON c.role_key = ur.role
    WHERE ur.user_id = auth.uid();

    IF v_caller_rank IS NULL THEN
      RAISE EXCEPTION 'Rôle catalogue introuvable pour votre compte';
    END IF;

    IF v_deleted_rank > v_caller_rank THEN
      RAISE EXCEPTION 'Impossible de supprimer un rôle supérieur au vôtre';
    END IF;
  END IF;

  SELECT count(*)::int INTO v_remaining
  FROM public.app_roles_catalog c
  WHERE c.role_key <> p_role_key;

  IF v_remaining < 1 THEN
    RAISE EXCEPTION 'Impossible de supprimer le dernier rôle du catalogue';
  END IF;

  SELECT c.role_key INTO v_fallback
  FROM public.app_roles_catalog c
  WHERE c.role_key <> p_role_key
    AND c.sort_rank < v_deleted_rank
  ORDER BY c.sort_rank DESC
  LIMIT 1;

  IF v_fallback IS NULL THEN
    SELECT c.role_key INTO v_fallback
    FROM public.app_roles_catalog c
    WHERE c.role_key <> p_role_key
    ORDER BY c.sort_rank ASC
    LIMIT 1;
  END IF;

  IF v_fallback IS NULL THEN
    RAISE EXCEPTION 'Aucun rôle de substitution';
  END IF;

  UPDATE public.user_roles ur
  SET role = v_fallback
  WHERE ur.role = p_role_key;

  DELETE FROM public.app_roles_catalog c WHERE c.role_key = p_role_key;
END;
$$;
