-- Récursion RLS : la politique SELECT sur conversation_group_members sous-requêtait la même table.
-- Fonction SECURITY DEFINER (rôle propriétaire) pour lire l''appartenance sans repasser par les politiques.

CREATE OR REPLACE FUNCTION public.is_member_of_conversation_group(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_group_members m
    WHERE m.group_id = _group_id AND m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_member_of_conversation_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation_group(uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can read group members" ON public.conversation_group_members;

CREATE POLICY "Members can read group members" ON public.conversation_group_members
  FOR SELECT TO authenticated
  USING (public.is_member_of_conversation_group(group_id));

-- Même sous-requête dans messages déclenchait l''évaluation des politiques sur conversation_group_members.
DROP POLICY IF EXISTS "Users can read own or group messages" ON public.messages;

CREATE POLICY "Users can read own or group messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR (group_id IS NOT NULL AND public.is_member_of_conversation_group(group_id))
  );