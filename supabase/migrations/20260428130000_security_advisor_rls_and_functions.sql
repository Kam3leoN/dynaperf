-- Security Advisor Supabase :
-- - Fonctions trigger : search_path fixe (évite le détournement de search_path).
-- - Politiques RLS : ne plus utiliser USING (true) / WITH CHECK (true) sur les tables signalées.

-- ---------------------------------------------------------------------------
-- 1) Trigger functions — mutable search_path
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.set_qr_codes_updated_at () SET search_path TO pg_catalog, public;

ALTER FUNCTION public.set_user_presence_updated_at () SET search_path TO pg_catalog, public;

-- ---------------------------------------------------------------------------
-- 2) audits — mise à jour : créateur ou staff
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can update audits" ON public.audits;

CREATE POLICY "Authenticated users can update audits" ON public.audits
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid ()
    OR public.has_role (auth.uid (), 'admin'::public.app_role)
    OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    created_by = auth.uid ()
    OR public.has_role (auth.uid (), 'admin'::public.app_role)
    OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
  );

-- ---------------------------------------------------------------------------
-- 3) audit_details — insert / update : lien avec l’audit parent
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert audit_details" ON public.audit_details;

CREATE POLICY "Authenticated users can insert audit_details" ON public.audit_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.audits a
      WHERE a.id = audit_id
        AND (
          a.created_by = auth.uid ()
          OR public.has_role (auth.uid (), 'admin'::public.app_role)
          OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update audit_details" ON public.audit_details;

CREATE POLICY "Authenticated users can update audit_details" ON public.audit_details
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audits a
      WHERE a.id = audit_details.audit_id
        AND (
          a.created_by = auth.uid ()
          OR public.has_role (auth.uid (), 'admin'::public.app_role)
          OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.audits a
      WHERE a.id = audit_details.audit_id
        AND (
          a.created_by = auth.uid ()
          OR public.has_role (auth.uid (), 'admin'::public.app_role)
          OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4) suivi_activite — mise à jour : créateur ou staff
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can update suivi_activite" ON public.suivi_activite;

CREATE POLICY "Authenticated users can update suivi_activite" ON public.suivi_activite
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid ()
    OR public.has_role (auth.uid (), 'admin'::public.app_role)
    OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    created_by = auth.uid ()
    OR public.has_role (auth.uid (), 'admin'::public.app_role)
    OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
  );

-- ---------------------------------------------------------------------------
-- 5) qr_codes — accès par créateur (ou admin / super_admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qr_codes_set_created_by ()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid ();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qr_codes_set_created_by ON public.qr_codes;

CREATE TRIGGER trg_qr_codes_set_created_by
  BEFORE INSERT ON public.qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.qr_codes_set_created_by ();

DROP POLICY IF EXISTS "qr_codes_select_authenticated" ON public.qr_codes;

DROP POLICY IF EXISTS "qr_codes_insert_authenticated" ON public.qr_codes;

DROP POLICY IF EXISTS "qr_codes_update_authenticated" ON public.qr_codes;

DROP POLICY IF EXISTS "qr_codes_delete_authenticated" ON public.qr_codes;

CREATE POLICY "qr_codes_select_own_or_staff" ON public.qr_codes
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid ()
    OR public.has_role (auth.uid (), 'admin'::public.app_role)
    OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
  );

CREATE POLICY "qr_codes_insert_own" ON public.qr_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid ());

CREATE POLICY "qr_codes_update_own_or_staff" ON public.qr_codes
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid ()
    OR public.has_role (auth.uid (), 'admin'::public.app_role)
    OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    created_by = auth.uid ()
    OR public.has_role (auth.uid (), 'admin'::public.app_role)
    OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
  );

CREATE POLICY "qr_codes_delete_own_or_staff" ON public.qr_codes
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid ()
    OR public.has_role (auth.uid (), 'admin'::public.app_role)
    OR public.has_role (auth.uid (), 'super_admin'::public.app_role)
  );
