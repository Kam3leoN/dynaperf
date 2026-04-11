-- Seuls les super_admin peuvent repasser app_modules.is_enabled de false à true.
-- Les administrateurs peuvent toujours désactiver un module (true → false).

CREATE OR REPLACE FUNCTION public.enforce_app_modules_super_reactivate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_enabled = false AND NEW.is_enabled = true THEN
    IF NOT public.has_role_text(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Seuls les super administrateurs peuvent réactiver un module désactivé';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_app_modules_super_reactivate
BEFORE UPDATE ON public.app_modules
FOR EACH ROW
EXECUTE FUNCTION public.enforce_app_modules_super_reactivate();

COMMENT ON FUNCTION public.enforce_app_modules_super_reactivate() IS
  'Empêche la réactivation (is_enabled false→true) hors rôle super_admin.';
