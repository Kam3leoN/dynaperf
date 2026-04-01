
-- ============================================================
-- 1. FIX: notifications INSERT — restrict to admins only
--    (notifications are system-generated via triggers/edge functions)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. FIX: audits — restrict DELETE to admins, scope INSERT/UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete audits" ON public.audits;
CREATE POLICY "Admins can delete audits"
  ON public.audits FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert audits" ON public.audits;
CREATE POLICY "Authenticated users can insert audits"
  ON public.audits FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update audits" ON public.audits;
CREATE POLICY "Authenticated users can update audits"
  ON public.audits FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- 3. FIX: audit_details — restrict DELETE to admins
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete audit_details" ON public.audit_details;
CREATE POLICY "Admins can delete audit_details"
  ON public.audit_details FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert audit_details" ON public.audit_details;
CREATE POLICY "Authenticated users can insert audit_details"
  ON public.audit_details FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update audit_details" ON public.audit_details;
CREATE POLICY "Authenticated users can update audit_details"
  ON public.audit_details FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- 4. FIX: suivi_activite — restrict DELETE to admins
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete suivi_activite" ON public.suivi_activite;
CREATE POLICY "Admins can delete suivi_activite"
  ON public.suivi_activite FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert suivi_activite" ON public.suivi_activite;
CREATE POLICY "Authenticated users can insert suivi_activite"
  ON public.suivi_activite FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update suivi_activite" ON public.suivi_activite;
CREATE POLICY "Authenticated users can update suivi_activite"
  ON public.suivi_activite FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- 5. FIX: avatars storage — add ownership check on UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Also fix avatar upload policy to enforce ownership
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
