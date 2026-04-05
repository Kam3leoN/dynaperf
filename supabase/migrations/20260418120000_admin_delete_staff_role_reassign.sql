-- Suppression de rôle : réaffectation automatique vers le rôle « inférieur » (rang immédiatement plus bas),
-- puis suppression du catalogue (CASCADE sur role_permission_defaults). Tous les rôles peuvent être supprimés
-- sauf le dernier du catalogue. handle_new_user : rôle par défaut = plus bas rang du catalogue (plus de hardcode member).

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

  SELECT count(*)::int INTO v_remaining
  FROM public.app_roles_catalog c
  WHERE c.role_key <> p_role_key;

  IF v_remaining < 1 THEN
    RAISE EXCEPTION 'Impossible de supprimer le dernier rôle du catalogue';
  END IF;

  -- Rôle inférieur : plus haut rang strictement plus bas que le rôle supprimé (sort_rank plus petit, le plus proche).
  SELECT c.role_key INTO v_fallback
  FROM public.app_roles_catalog c
  WHERE c.role_key <> p_role_key
    AND c.sort_rank < v_deleted_rank
  ORDER BY c.sort_rank DESC
  LIMIT 1;

  -- Si on supprime déjà le rôle le plus « bas », basculer vers le rang minimal restant.
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_default_role text;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_presence (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT c.role_key INTO v_default_role
  FROM public.app_roles_catalog c
  ORDER BY c.sort_rank ASC
  LIMIT 1;

  IF NEW.email = 'cmalzat@dynabuy.fr'
     AND EXISTS (SELECT 1 FROM public.app_roles_catalog c2 WHERE c2.role_key = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  ELSIF v_default_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_default_role)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
