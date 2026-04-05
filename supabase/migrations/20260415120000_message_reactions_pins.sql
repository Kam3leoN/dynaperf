-- Réactions sur les messages + épinglage (style Discord)

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.messages.pinned_at IS 'Si non null, le message est épinglé dans la conversation.';
COMMENT ON COLUMN public.messages.pinned_by IS 'Utilisateur ayant épinglé le message.';

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_reactions_one_per_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions (message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Lecture d''un message (même logique que la politique SELECT sur messages)
CREATE OR REPLACE FUNCTION public.user_can_read_message (_message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = _message_id
      AND (
        m.sender_id = auth.uid()
        OR m.recipient_id = auth.uid()
        OR (m.group_id IS NOT NULL AND public.is_member_of_conversation_group (m.group_id))
        OR (
          m.group_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.conversation_groups cg
            WHERE cg.id = m.group_id AND cg.is_public = true
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_read_message (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_read_message (uuid) TO authenticated;

CREATE POLICY "Read reactions if can read message"
  ON public.message_reactions
  FOR SELECT
  TO authenticated
  USING (public.user_can_read_message (message_id));

CREATE POLICY "Add own reaction if can read message"
  ON public.message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid () = user_id
    AND public.user_can_read_message (message_id)
    AND length(trim(emoji)) > 0
    AND length(emoji) <= 32
  );

CREATE POLICY "Remove own reaction"
  ON public.message_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid () = user_id AND public.user_can_read_message (message_id));

-- RPC : ne modifie que les colonnes d''épinglage (pas de contournement RLS sur le reste)
CREATE OR REPLACE FUNCTION public.set_message_pin_state (p_message_id uuid, p_pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.user_can_read_message (p_message_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_pinned THEN
    UPDATE public.messages
    SET
      pinned_at = now(),
      pinned_by = auth.uid ()
    WHERE id = p_message_id;
  ELSE
    UPDATE public.messages
    SET
      pinned_at = NULL,
      pinned_by = NULL
    WHERE id = p_message_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_message_pin_state (uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_message_pin_state (uuid, boolean) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
