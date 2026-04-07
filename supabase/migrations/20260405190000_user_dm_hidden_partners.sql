-- Masquage d’une conversation MP côté viewer uniquement (l’autre utilisateur conserve son historique et sa liste).

CREATE TABLE IF NOT EXISTS public.user_dm_hidden_partners (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  partner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_dm_hidden_partners_pkey PRIMARY KEY (user_id, partner_user_id),
  CONSTRAINT user_dm_hidden_partners_no_self CHECK (user_id <> partner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_dm_hidden_partners_user ON public.user_dm_hidden_partners (user_id);

ALTER TABLE public.user_dm_hidden_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_dm_hidden_partners_select_own"
  ON public.user_dm_hidden_partners
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_dm_hidden_partners_insert_own"
  ON public.user_dm_hidden_partners
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_dm_hidden_partners_update_own"
  ON public.user_dm_hidden_partners
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_dm_hidden_partners_delete_own"
  ON public.user_dm_hidden_partners
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_dm_hidden_partners IS
  'Retire une conversation MP de la liste pour un utilisateur sans supprimer les messages pour l’autre partie.';

DO $pub$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_dm_hidden_partners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_dm_hidden_partners;
  END IF;
END
$pub$;
