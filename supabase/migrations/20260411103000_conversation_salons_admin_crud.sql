-- Schéma salons / groupes (si 20260408130000_conversation_salons_public n’a jamais été appliquée sur le distant)
-- + politiques de lecture / messages
-- + salons : création / mise à jour / suppression réservées aux admin et super_admin (has_role(…, 'admin') inclut super_admin).

-- --- Colonnes et contraintes ---
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

-- --- Évite la récursion RLS sur conversation_group_members (nécessaire pour la politique SELECT ci-dessous) ---
CREATE OR REPLACE FUNCTION public.is_member_of_conversation_group(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_group_members m
    WHERE m.group_id = _group_id AND m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_member_of_conversation_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation_group(uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can read group members" ON public.conversation_group_members;

CREATE POLICY "Members can read group members"
  ON public.conversation_group_members FOR SELECT
  TO authenticated
  USING (public.is_member_of_conversation_group(group_id));

DROP POLICY IF EXISTS "Members can read groups" ON public.conversation_groups;

CREATE POLICY "Members can read groups"
  ON public.conversation_groups FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR public.is_member_of_conversation_group(id)
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

-- --- CRUD salons réservé aux admins ; groupes privés au créateur ---

DROP POLICY IF EXISTS "Authenticated can create groups" ON public.conversation_groups;

CREATE POLICY "Authenticated can create groups"
  ON public.conversation_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      (
        is_public = true
        AND kind = 'salon'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
      )
      OR (
        is_public = false
        AND kind = 'group'
      )
    )
  );

DROP POLICY IF EXISTS "Creator can update group" ON public.conversation_groups;

CREATE POLICY "Creator can update group"
  ON public.conversation_groups FOR UPDATE
  TO authenticated
  USING (
    (
      is_public = true
      AND kind = 'salon'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    OR (
      is_public = false
      AND auth.uid() = created_by
    )
  )
  WITH CHECK (
    (
      is_public = true
      AND kind = 'salon'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    OR (
      is_public = false
      AND auth.uid() = created_by
    )
  );

DROP POLICY IF EXISTS "Creator can delete group" ON public.conversation_groups;

CREATE POLICY "Creator can delete group"
  ON public.conversation_groups FOR DELETE
  TO authenticated
  USING (
    (
      is_public = true
      AND kind = 'salon'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    OR (
      is_public = false
      AND auth.uid() = created_by
    )
  );
