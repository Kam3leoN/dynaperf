-- Permet aux admins / super_admins de mettre à jour n'importe quel profil
-- (avatar depuis l'UI Admin : update direct, sans dépendre uniquement de la Edge Function).

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
