-- Annuaire type Discord : tout utilisateur connecté peut lire les rôles et profils des autres
-- (affichage liste membres). Les écritures sur user_roles restent protégées par les politiques existantes + trigger.

CREATE POLICY "Authenticated can read all user_roles for directory"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read all profiles for directory"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
