-- Écriture de la matrice rôle × permission et du catalogue (admin / super_admin via has_role).

DROP POLICY IF EXISTS "Admins manage role_permission_defaults" ON public.role_permission_defaults;
CREATE POLICY "Admins manage role_permission_defaults"
  ON public.role_permission_defaults FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage app_permissions" ON public.app_permissions;
CREATE POLICY "Admins manage app_permissions"
  ON public.app_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
