-- Catalogue de permissions, défauts par rôle staff, overrides utilisateur,
-- user_has_permission(), get_my_permissions() pour le client.

CREATE TABLE IF NOT EXISTS public.app_permissions (
  key text PRIMARY KEY,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.role_permission_defaults (
  role public.app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.app_permissions (key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (role, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.app_permissions (key) ON DELETE CASCADE,
  allowed boolean NOT NULL,
  PRIMARY KEY (user_id, permission_key)
);

ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permission_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read app_permissions" ON public.app_permissions;
CREATE POLICY "Authenticated read app_permissions"
  ON public.app_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read role_permission_defaults" ON public.role_permission_defaults;
CREATE POLICY "Authenticated read role_permission_defaults"
  ON public.role_permission_defaults FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own permission overrides" ON public.user_permission_overrides;
CREATE POLICY "Users read own permission overrides"
  ON public.user_permission_overrides FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage permission overrides" ON public.user_permission_overrides;
CREATE POLICY "Admins manage permission overrides"
  ON public.user_permission_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- --- Seed permissions ---
INSERT INTO public.app_permissions (key, description) VALUES
  ('nav.hub', 'Hub, préférences, profil, notifications (zone accueil)'),
  ('nav.audits', 'Audits : tableau de bord, registre, formulaires'),
  ('nav.activite', 'Suivis d’activité'),
  ('nav.reseau', 'Réseau, business plan'),
  ('nav.drive', 'Drive'),
  ('nav.sondages', 'Sondages'),
  ('nav.historique', 'Historique / journal d’activité'),
  ('nav.messages', 'Messagerie'),
  ('nav.admin', 'Zone administration'),
  ('messaging.manage_salons', 'Créer / modifier / supprimer les salons publics')
ON CONFLICT (key) DO NOTHING;

-- --- Defaults : member = pas d’audits par défaut ---
INSERT INTO public.role_permission_defaults (role, permission_key, allowed) VALUES
  ('member', 'nav.hub', true),
  ('member', 'nav.audits', false),
  ('member', 'nav.activite', true),
  ('member', 'nav.reseau', true),
  ('member', 'nav.drive', true),
  ('member', 'nav.sondages', true),
  ('member', 'nav.historique', true),
  ('member', 'nav.messages', true),
  ('member', 'nav.admin', false),
  ('member', 'messaging.manage_salons', false),

  ('bot', 'nav.hub', false),
  ('bot', 'nav.audits', false),
  ('bot', 'nav.activite', false),
  ('bot', 'nav.reseau', false),
  ('bot', 'nav.drive', false),
  ('bot', 'nav.sondages', false),
  ('bot', 'nav.historique', false),
  ('bot', 'nav.messages', false),
  ('bot', 'nav.admin', false),
  ('bot', 'messaging.manage_salons', false),

  ('moderator', 'nav.hub', true),
  ('moderator', 'nav.audits', true),
  ('moderator', 'nav.activite', true),
  ('moderator', 'nav.reseau', true),
  ('moderator', 'nav.drive', true),
  ('moderator', 'nav.sondages', true),
  ('moderator', 'nav.historique', true),
  ('moderator', 'nav.messages', true),
  ('moderator', 'nav.admin', false),
  ('moderator', 'messaging.manage_salons', true),

  ('super_moderator', 'nav.hub', true),
  ('super_moderator', 'nav.audits', true),
  ('super_moderator', 'nav.activite', true),
  ('super_moderator', 'nav.reseau', true),
  ('super_moderator', 'nav.drive', true),
  ('super_moderator', 'nav.sondages', true),
  ('super_moderator', 'nav.historique', true),
  ('super_moderator', 'nav.messages', true),
  ('super_moderator', 'nav.admin', false),
  ('super_moderator', 'messaging.manage_salons', true),

  ('admin', 'nav.hub', true),
  ('admin', 'nav.audits', true),
  ('admin', 'nav.activite', true),
  ('admin', 'nav.reseau', true),
  ('admin', 'nav.drive', true),
  ('admin', 'nav.sondages', true),
  ('admin', 'nav.historique', true),
  ('admin', 'nav.messages', true),
  ('admin', 'nav.admin', true),
  ('admin', 'messaging.manage_salons', true),

  ('super_admin', 'nav.hub', true),
  ('super_admin', 'nav.audits', true),
  ('super_admin', 'nav.activite', true),
  ('super_admin', 'nav.reseau', true),
  ('super_admin', 'nav.drive', true),
  ('super_admin', 'nav.sondages', true),
  ('super_admin', 'nav.historique', true),
  ('super_admin', 'nav.messages', true),
  ('super_admin', 'nav.admin', true),
  ('super_admin', 'messaging.manage_salons', true),

  -- Legacy enum values (si encore présents en base)
  ('lecteur', 'nav.hub', true),
  ('lecteur', 'nav.audits', false),
  ('lecteur', 'nav.activite', true),
  ('lecteur', 'nav.reseau', true),
  ('lecteur', 'nav.drive', true),
  ('lecteur', 'nav.sondages', true),
  ('lecteur', 'nav.historique', true),
  ('lecteur', 'nav.messages', true),
  ('lecteur', 'nav.admin', false),
  ('lecteur', 'messaging.manage_salons', false),

  ('user', 'nav.hub', true),
  ('user', 'nav.audits', false),
  ('user', 'nav.activite', true),
  ('user', 'nav.reseau', true),
  ('user', 'nav.drive', true),
  ('user', 'nav.sondages', true),
  ('user', 'nav.historique', true),
  ('user', 'nav.messages', true),
  ('user', 'nav.admin', false),
  ('user', 'messaging.manage_salons', false),

  ('redacteur', 'nav.hub', true),
  ('redacteur', 'nav.audits', true),
  ('redacteur', 'nav.activite', true),
  ('redacteur', 'nav.reseau', true),
  ('redacteur', 'nav.drive', true),
  ('redacteur', 'nav.sondages', true),
  ('redacteur', 'nav.historique', true),
  ('redacteur', 'nav.messages', true),
  ('redacteur', 'nav.admin', false),
  ('redacteur', 'messaging.manage_salons', true)
ON CONFLICT (role, permission_key) DO UPDATE SET allowed = EXCLUDED.allowed;

-- --- Fonctions ---
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
  v_role public.app_role;
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

REVOKE ALL ON FUNCTION public.user_has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE (permission_key text, allowed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ap.key AS permission_key,
    public.user_has_permission(auth.uid(), ap.key) AS allowed
  FROM public.app_permissions ap;
$$;

REVOKE ALL ON FUNCTION public.get_my_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
