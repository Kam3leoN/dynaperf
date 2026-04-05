-- Statut type Discord (en ligne, inactif, ne pas deranger, invisible) partage entre utilisateurs connectes.
-- Idempotent : la table peut déjà exister sur des bases où l’ancienne migration doublonnée avait été appliquée à la main.

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'online'
    CHECK (status IN ('online', 'idle', 'dnd', 'invisible')),
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_updated ON public.user_presence (updated_at DESC);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read all presence" ON public.user_presence;
CREATE POLICY "Authenticated can read all presence"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users insert own presence" ON public.user_presence;
CREATE POLICY "Users insert own presence"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own presence" ON public.user_presence;
CREATE POLICY "Users update own presence"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DO $pub$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  END IF;
END
$pub$;

CREATE OR REPLACE FUNCTION public.set_user_presence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_user_presence_updated ON public.user_presence;
CREATE TRIGGER trg_user_presence_updated
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_presence_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_presence (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  IF NEW.email = 'cmalzat@dynabuy.fr' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

INSERT INTO public.user_presence (user_id)
SELECT p.user_id FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_presence up WHERE up.user_id = p.user_id)
ON CONFLICT (user_id) DO NOTHING;
