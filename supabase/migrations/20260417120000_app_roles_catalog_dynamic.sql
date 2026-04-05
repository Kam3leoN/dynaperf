-- Rôles dynamiques : catalogue textuel (plus besoin d’ALTER TYPE pour un nouveau rôle).
-- user_roles.role et role_permission_defaults.role deviennent text → FK app_roles_catalog(role_key).
-- L’enum public.app_role est conservé uniquement pour la signature has_role(uuid, app_role) des politiques existantes.

-- --- 1. Catalogue ---
CREATE TABLE public.app_roles_catalog (
  role_key text PRIMARY KEY
    CONSTRAINT app_roles_catalog_key_chk CHECK (
      role_key ~ '^[a-z][a-z0-9_]*$'
      AND char_length(role_key) <= 48
    ),
  label text NOT NULL,
  sort_rank int NOT NULL CHECK (sort_rank > 0),
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_roles_catalog (role_key, label, sort_rank, is_system) VALUES
  ('super_admin', 'Super administrateur', 100, true),
  ('admin', 'Administrateur', 90, true),
  ('super_moderator', 'Super modérateur', 75, true),
  ('moderator', 'Modérateur', 55, true),
  ('bot', 'Bot', 40, true),
  ('member', 'Utilisateur', 20, true);

ALTER TABLE public.app_roles_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read app_roles_catalog" ON public.app_roles_catalog;
CREATE POLICY "Authenticated read app_roles_catalog"
  ON public.app_roles_catalog FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage app_roles_catalog" ON public.app_roles_catalog;
CREATE POLICY "Admins manage app_roles_catalog"
  ON public.app_roles_catalog FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'super_admin')
    )
  );

-- --- 2. role_permission_defaults : enum → text + FK ---
CREATE TABLE public._mig_rpd AS
SELECT role::text AS role_txt, permission_key, allowed FROM public.role_permission_defaults;

DROP TABLE public.role_permission_defaults;

CREATE TABLE public.role_permission_defaults (
  role text NOT NULL REFERENCES public.app_roles_catalog (role_key) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.app_permissions (key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (role, permission_key)
);

INSERT INTO public.role_permission_defaults (role, permission_key, allowed)
SELECT b.role_txt, b.permission_key, b.allowed
FROM public._mig_rpd b
INNER JOIN public.app_roles_catalog c ON c.role_key = b.role_txt;

DROP TABLE public._mig_rpd;

ALTER TABLE public.role_permission_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read role_permission_defaults" ON public.role_permission_defaults;
CREATE POLICY "Authenticated read role_permission_defaults"
  ON public.role_permission_defaults FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage role_permission_defaults" ON public.role_permission_defaults;
CREATE POLICY "Admins manage role_permission_defaults"
  ON public.role_permission_defaults FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'super_admin')
    )
  );

-- --- 3. user_roles : enum → text + FK ---
DROP TRIGGER IF EXISTS user_roles_guard_super_admin ON public.user_roles;

ALTER TABLE public.user_roles
  ADD COLUMN role_text text REFERENCES public.app_roles_catalog (role_key);

UPDATE public.user_roles SET role_text = role::text;

-- Ces politiques lisent user_roles.role (enum) : obligation de les retirer avant DROP COLUMN
DROP POLICY IF EXISTS "Admins manage app_roles_catalog" ON public.app_roles_catalog;
DROP POLICY IF EXISTS "Admins manage role_permission_defaults" ON public.role_permission_defaults;
DROP POLICY IF EXISTS "Admins and super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage app_permissions" ON public.app_permissions;

ALTER TABLE public.user_roles DROP COLUMN role;

ALTER TABLE public.user_roles RENAME COLUMN role_text TO role;

ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;

-- Politiques catalogue : désormais role est texte
DROP POLICY IF EXISTS "Admins manage app_roles_catalog" ON public.app_roles_catalog;
CREATE POLICY "Admins manage app_roles_catalog"
  ON public.app_roles_catalog FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins manage role_permission_defaults" ON public.role_permission_defaults;
CREATE POLICY "Admins manage role_permission_defaults"
  ON public.role_permission_defaults FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- --- 4. Garde super_admin (texte) ---
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
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO caller_super;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'super_admin' AND NOT caller_super THEN
      RAISE EXCEPTION 'Seul un super admin peut attribuer ce rôle';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role = 'super_admin' AND NOT caller_super THEN
      RAISE EXCEPTION 'Seul un super admin peut attribuer ce rôle';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin' AND NOT caller_super THEN
      RAISE EXCEPTION 'Seul un super admin peut retirer le rôle super admin';
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER user_roles_guard_super_admin
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_roles_guard_super_admin();

-- --- 5. Nouveaux utilisateurs ---
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_presence (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  IF NEW.email = 'cmalzat@dynabuy.fr' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- --- 6. has_role : implémentation texte + enveloppe enum (politiques inchangées) ---
CREATE OR REPLACE FUNCTION public.has_role_text(_user_id uuid, _role_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role = _role_key
        OR (ur.role = 'super_admin' AND _role_key = 'admin')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.has_role_text(_user_id, _role::text);
$$;

REVOKE ALL ON FUNCTION public.has_role_text(uuid, text) FROM PUBLIC;

-- --- 7. staff_rank + suppression staff_role_rank ---
CREATE OR REPLACE FUNCTION public.staff_rank(_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (
      SELECT c.sort_rank
      FROM public.user_roles ur
      JOIN public.app_roles_catalog c ON c.role_key = ur.role
      WHERE ur.user_id = _user_id
      LIMIT 1
    ),
    0
  );
$$;

REVOKE ALL ON FUNCTION public.staff_rank(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_rank(uuid) TO authenticated;

DROP TABLE IF EXISTS public.staff_role_rank;

-- --- 8. user_has_permission ---
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override boolean;
  v_default boolean;
  v_role text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT uo.allowed INTO v_override
  FROM public.user_permission_overrides uo
  WHERE uo.user_id = _user_id AND uo.permission_key = _key;

  IF FOUND THEN
    RETURN v_override;
  END IF;

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  SELECT rpd.allowed INTO v_default
  FROM public.role_permission_defaults rpd
  WHERE rpd.role = v_role AND rpd.permission_key = _key;

  IF FOUND THEN
    RETURN v_default;
  END IF;

  RETURN false;
END;
$$;

-- --- 9. RPC admin : texte + création / suppression de rôle ---
DROP FUNCTION IF EXISTS public.admin_set_role_permission_default(public.app_role, text, boolean);

CREATE OR REPLACE FUNCTION public.admin_set_role_permission_default(
  p_role text,
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
      AND ur.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier les droits par rôle';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.app_roles_catalog c WHERE c.role_key = p_role) THEN
    RAISE EXCEPTION 'Rôle inconnu';
  END IF;

  INSERT INTO public.role_permission_defaults (role, permission_key, allowed)
  VALUES (p_role, p_permission_key, p_allowed)
  ON CONFLICT (role, permission_key) DO UPDATE SET allowed = EXCLUDED.allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_role_permission_default(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_role_permission_default(text, text, boolean) TO authenticated;

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
      AND ur.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier les droits par rôle';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.app_permissions ap WHERE ap.key = p_permission_key) THEN
    RAISE EXCEPTION 'Permission inconnue';
  END IF;

  INSERT INTO public.role_permission_defaults (role, permission_key, allowed)
  SELECT c.role_key, p_permission_key, false
  FROM public.app_roles_catalog c
  ON CONFLICT (role, permission_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_seed_role_permission_defaults_for_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_seed_role_permission_defaults_for_key(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_staff_role(
  p_role_key text,
  p_label text,
  p_sort_rank int
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
      AND ur.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Interdit';
  END IF;

  IF p_role_key !~ '^[a-z][a-z0-9_]*$' OR char_length(p_role_key) > 48 THEN
    RAISE EXCEPTION 'Clé invalide (a-z, chiffres, tirets bas, max 48)';
  END IF;

  IF p_sort_rank IS NULL OR p_sort_rank < 1 OR p_sort_rank > 9999 THEN
    RAISE EXCEPTION 'Rang invalide';
  END IF;

  INSERT INTO public.app_roles_catalog (role_key, label, sort_rank, is_system)
  VALUES (p_role_key, trim(p_label), p_sort_rank, false);

  INSERT INTO public.role_permission_defaults (role, permission_key, allowed)
  SELECT p_role_key, ap.key, false
  FROM public.app_permissions ap
  ON CONFLICT (role, permission_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_staff_role(text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_staff_role(text, text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_staff_role(p_role_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sys boolean;
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

  SELECT is_system INTO v_sys FROM public.app_roles_catalog WHERE role_key = p_role_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rôle inconnu';
  END IF;
  IF v_sys THEN
    RAISE EXCEPTION 'Impossible de supprimer un rôle système';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.role = p_role_key) THEN
    RAISE EXCEPTION 'Des utilisateurs ont encore ce rôle';
  END IF;

  DELETE FROM public.app_roles_catalog WHERE role_key = p_role_key;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_staff_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff_role(text) TO authenticated;

-- --- 10. Politique profils (texte) ---
DROP POLICY IF EXISTS "Admins and super admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins and super admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- --- 11. Politiques app_permissions (texte) ---
DROP POLICY IF EXISTS "Admins manage app_permissions" ON public.app_permissions;

CREATE POLICY "Admins manage app_permissions"
  ON public.app_permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );
