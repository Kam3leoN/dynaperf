-- Marquer les messages de groupe comme lus : les salons publics n’ont qu’une ligne par message
-- avec recipient_id = expéditeur, donc la politique RLS « recipient OR sender » empêchait les
-- autres membres de faire UPDATE(read). Cette RPC applique la même logique d’accès que la
-- lecture des messages (salon public, membre, rang staff, permission).

CREATE OR REPLACE FUNCTION public.mark_group_messages_read (p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  cg public.conversation_groups%ROWTYPE;
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT *
  INTO cg
  FROM public.conversation_groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'group not found';
  END IF;

  IF NOT (
    public.is_member_of_conversation_group (cg.id)
    OR cg.is_public = true
    OR (
      cg.salon_access_rule = 'min_staff_rank'
      AND cg.salon_min_staff_rank IS NOT NULL
      AND public.staff_rank (auth.uid ()) >= cg.salon_min_staff_rank
    )
    OR (
      cg.salon_access_rule = 'permission'
      AND cg.salon_required_permission IS NOT NULL
      AND public.user_has_permission (auth.uid (), cg.salon_required_permission)
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF cg.is_public = true AND cg.kind = 'salon' THEN
    UPDATE public.messages m
    SET read = true
    WHERE m.group_id = p_group_id
      AND m.read = false
      AND m.sender_id <> auth.uid ();
  ELSE
    UPDATE public.messages m
    SET read = true
    WHERE m.group_id = p_group_id
      AND m.read = false
      AND m.sender_id <> auth.uid ()
      AND m.recipient_id = auth.uid ();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_group_messages_read (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_group_messages_read (uuid) TO authenticated;
