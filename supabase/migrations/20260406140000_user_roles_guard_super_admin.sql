-- Règles super_admin sur user_roles pour les écritures via le client (JWT).
-- Si auth.uid() est NULL (ex. service role / Edge Function), aucune contrainte ici.

CREATE OR REPLACE FUNCTION public.user_roles_guard_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_super boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'::public.app_role
  ) INTO caller_super;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'super_admin'::public.app_role AND NOT caller_super THEN
      RAISE EXCEPTION 'Seul un super admin peut attribuer ce rôle';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role = 'super_admin'::public.app_role AND NOT caller_super THEN
      RAISE EXCEPTION 'Seul un super admin peut attribuer ce rôle';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin'::public.app_role AND NOT caller_super THEN
      RAISE EXCEPTION 'Seul un super admin peut retirer le rôle super admin';
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_guard_super_admin ON public.user_roles;
CREATE TRIGGER user_roles_guard_super_admin
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_roles_guard_super_admin();
