-- RLS matrice permissions : admin ET super_admin explicites (évite les écarts si has_role diffère en prod).
-- Corrige typiquement : « new row violates row-level security policy for table role_permission_defaults ».

DROP POLICY IF EXISTS "Admins manage role_permission_defaults" ON public.role_permission_defaults;
CREATE POLICY "Admins manage role_permission_defaults"
  ON public.role_permission_defaults FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Admins manage app_permissions" ON public.app_permissions;
CREATE POLICY "Admins manage app_permissions"
  ON public.app_permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
    )
  );
