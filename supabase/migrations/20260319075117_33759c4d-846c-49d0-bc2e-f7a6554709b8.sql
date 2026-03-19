-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'redacteur';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lecteur';

-- Allow admin to read all profiles (needed for user list)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
