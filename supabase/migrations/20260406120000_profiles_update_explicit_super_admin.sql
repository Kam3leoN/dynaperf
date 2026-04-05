-- Mise à jour des profils (ex. avatar) par l’Admin : droit explicite pour admin ET super_admin.
-- (Équivalent à has_role(…, 'admin') après bf03da60, mais lisible et sans ambiguïté.)

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and super admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins and super admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
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
