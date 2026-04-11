-- Identité app, assets d'expression, invitations, couleurs de rôles.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- app_settings (singleton) ---
CREATE TABLE public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_name text NOT NULL DEFAULT 'DynaPerf',
  description text,
  logo_url text,
  favicon_url text,
  icon_512_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
CREATE POLICY "Public read app_settings"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins update app_settings" ON public.app_settings;
CREATE POLICY "Admins update app_settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- --- Rôle : couleur + icône optionnelle ---
ALTER TABLE public.app_roles_catalog
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS icon_url text;

COMMENT ON COLUMN public.app_roles_catalog.color_hex IS 'Couleur affichée (#RRGGBB), optionnel';
COMMENT ON COLUMN public.app_roles_catalog.icon_url IS 'URL publique icône optionnelle (Storage)';

-- --- Expression (emojis, autocollants, sons) ---
CREATE TABLE public.expression_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type text NOT NULL CHECK (asset_type IN ('emoji', 'sticker', 'sound')),
  label text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expression_assets_type_sort_idx ON public.expression_assets (asset_type, sort_order);

ALTER TABLE public.expression_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read expression_assets" ON public.expression_assets;
CREATE POLICY "Authenticated read expression_assets"
  ON public.expression_assets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage expression_assets" ON public.expression_assets;
CREATE POLICY "Admins manage expression_assets"
  ON public.expression_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- --- Invitations ---
CREATE TABLE public.app_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  label text,
  role_key text REFERENCES public.app_roles_catalog (role_key) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  max_uses int CHECK (max_uses IS NULL OR max_uses > 0),
  uses_count int NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT app_invitations_uses_cap CHECK (
    max_uses IS NULL OR uses_count <= max_uses
  )
);

CREATE INDEX app_invitations_expires_idx ON public.app_invitations (expires_at);

ALTER TABLE public.app_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read app_invitations" ON public.app_invitations;
CREATE POLICY "Admins read app_invitations"
  ON public.app_invitations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins insert app_invitations" ON public.app_invitations;
CREATE POLICY "Admins insert app_invitations"
  ON public.app_invitations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update app_invitations" ON public.app_invitations;
CREATE POLICY "Admins update app_invitations"
  ON public.app_invitations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Stockage branding / expression sous bucket avatars
DROP POLICY IF EXISTS "Admins manage branding folder" ON storage.objects;
CREATE POLICY "Admins manage branding folder"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'branding/%'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'branding/%'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins manage expression folder" ON storage.objects;
CREATE POLICY "Admins manage expression folder"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'expression/%'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'expression/%'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Lecture publique des fichiers branding/expression (bucket déjà public pour avatars)
DROP POLICY IF EXISTS "Public read branding expression" ON storage.objects;
CREATE POLICY "Public read branding expression"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND (name LIKE 'branding/%' OR name LIKE 'expression/%')
  );

-- RPC : création invitation (retourne le jeton brut une fois)
CREATE OR REPLACE FUNCTION public.admin_create_app_invitation(
  p_label text,
  p_role_key text,
  p_expires_at timestamptz,
  p_max_uses int
)
RETURNS TABLE (invitation_id uuid, raw_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_raw text;
  v_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  v_raw := 'dpinv_' || encode(gen_random_bytes(24), 'hex');
  v_hash := encode(digest(v_raw, 'sha256'::text), 'hex');
  INSERT INTO public.app_invitations (token_hash, label, role_key, expires_at, max_uses, created_by)
  VALUES (
    v_hash,
    NULLIF(trim(p_label), ''),
    NULLIF(trim(p_role_key), ''),
    p_expires_at,
    CASE WHEN p_max_uses IS NULL OR p_max_uses < 1 THEN NULL ELSE p_max_uses END,
    auth.uid()
  )
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, v_raw;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_app_invitation(text, text, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_app_invitation(text, text, timestamptz, int) TO authenticated;

-- Vérification jeton (inscription / première connexion)
CREATE OR REPLACE FUNCTION public.verify_app_invitation_token(p_token text)
RETURNS TABLE (invitation_id uuid, role_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT i.id, i.role_key
  FROM public.app_invitations i
  WHERE i.token_hash = encode(digest(p_token, 'sha256'::text), 'hex')
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
    AND (i.max_uses IS NULL OR i.uses_count < i.max_uses);
$$;

REVOKE ALL ON FUNCTION public.verify_app_invitation_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_app_invitation_token(text) TO anon, authenticated;

COMMENT ON TABLE public.app_settings IS 'Paramètres globaux d’identité (titre, favicon, logo).';
COMMENT ON TABLE public.expression_assets IS 'Bibliothèque emoji / autocollant / son pour la messagerie.';
COMMENT ON TABLE public.app_invitations IS 'Invitations par lien (jeton hashé).';
