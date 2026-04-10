-- Suppression messages : RPC sécurisée pour contourter les cas où le DELETE direct PostgREST + RLS
-- ne renvoie aucune ligne (0 deleted) alors que l’utilisateur voit le message (SELECT OK).
-- Même logique que la politique SELECT + (expéditeur OU admin).

CREATE OR REPLACE FUNCTION public.message_moderation_delete_allowed (m public.messages)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    (
      auth.uid () = m.sender_id
      OR public.has_role (auth.uid (), 'admin'::public.app_role)
    )
    AND (
      auth.uid () = m.sender_id
      OR auth.uid () = m.recipient_id
      OR (
        m.group_id IS NOT NULL
        AND public.is_member_of_conversation_group (m.group_id)
      )
      OR (
        m.group_id IS NOT NULL
        AND EXISTS (
          SELECT
            1
          FROM
            public.conversation_groups cg
          WHERE
            cg.id = m.group_id
            AND cg.is_public = TRUE
        )
      )
      OR (
        m.group_id IS NOT NULL
        AND EXISTS (
          SELECT
            1
          FROM
            public.conversation_groups cg
          WHERE
            cg.id = m.group_id
            AND cg.salon_access_rule = 'min_staff_rank'
            AND cg.salon_min_staff_rank IS NOT NULL
            AND public.staff_rank (auth.uid ()) >= cg.salon_min_staff_rank
        )
      )
      OR (
        m.group_id IS NOT NULL
        AND EXISTS (
          SELECT
            1
          FROM
            public.conversation_groups cg
          WHERE
            cg.id = m.group_id
            AND cg.salon_access_rule = 'permission'
            AND cg.salon_required_permission IS NOT NULL
            AND public.user_has_permission (auth.uid (), cg.salon_required_permission)
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.message_moderation_delete_allowed (public.messages) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.message_moderation_delete_allowed (public.messages) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_messages_moderation_by_send (
  p_group_id uuid,
  p_group_send_id uuid,
  p_sender_id uuid
) RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  DELETE FROM public.messages m
  WHERE
    m.group_id = p_group_id
    AND m.group_send_id = p_group_send_id
    AND m.sender_id = p_sender_id
    AND public.message_moderation_delete_allowed (m)
  RETURNING
    m.id;
$$;

REVOKE ALL ON FUNCTION public.delete_messages_moderation_by_send (uuid, uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.delete_messages_moderation_by_send (uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_messages_moderation_by_ids (p_message_ids uuid[]) RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  DELETE FROM public.messages m
  WHERE
    m.id = ANY (p_message_ids)
    AND public.message_moderation_delete_allowed (m)
  RETURNING
    m.id;
$$;

REVOKE ALL ON FUNCTION public.delete_messages_moderation_by_ids (uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.delete_messages_moderation_by_ids (uuid[]) TO authenticated;
