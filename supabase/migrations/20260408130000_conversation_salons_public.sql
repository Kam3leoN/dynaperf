-- Salons publics (tous les utilisateurs authentifiés) vs groupes privés (membres explicites).
-- Messages d'un salon : une ligne par envoi, recipient_id = sender_id ; lecture via RLS is_public.

ALTER TABLE public.conversation_groups
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'group',
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.conversation_groups
  DROP CONSTRAINT IF EXISTS conversation_groups_kind_check;

ALTER TABLE public.conversation_groups
  ADD CONSTRAINT conversation_groups_kind_check CHECK (kind IN ('group', 'salon'));

ALTER TABLE public.conversation_groups
  DROP CONSTRAINT IF EXISTS conversation_groups_public_salon_check;

ALTER TABLE public.conversation_groups
  ADD CONSTRAINT conversation_groups_public_salon_check CHECK (NOT is_public OR kind = 'salon');

COMMENT ON COLUMN public.conversation_groups.kind IS 'group = membres explicites ; salon = canal public.';
COMMENT ON COLUMN public.conversation_groups.is_public IS 'Si true, tout utilisateur authentifié lit le salon et ses messages.';

DROP POLICY IF EXISTS "Members can read groups" ON public.conversation_groups;

CREATE POLICY "Members can read groups"
  ON public.conversation_groups FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_group_members cgm
      WHERE cgm.group_id = conversation_groups.id AND cgm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can read own or group messages" ON public.messages;

CREATE POLICY "Users can read own or group messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR (group_id IS NOT NULL AND public.is_member_of_conversation_group(group_id))
    OR (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.conversation_groups cg
        WHERE cg.id = messages.group_id AND cg.is_public = true
      )
    )
  );

-- Salon général (si au moins un compte auth existe)
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF uid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.conversation_groups WHERE is_public = true AND kind = 'salon' AND name = 'Salon général'
  ) THEN
    INSERT INTO public.conversation_groups (name, created_by, kind, is_public)
    VALUES ('Salon général', uid, 'salon', true);
  END IF;
END $$;

-- Création : un salon peut être public ; un groupe reste privé.
DROP POLICY IF EXISTS "Authenticated can create groups" ON public.conversation_groups;

CREATE POLICY "Authenticated can create groups"
  ON public.conversation_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (NOT is_public OR kind = 'salon')
  );
