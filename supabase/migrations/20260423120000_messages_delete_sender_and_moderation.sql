-- Suppression messages :
-- 1) L’expéditeur peut supprimer ses propres messages (lus ou non) — avant : seulement non lus.
-- 2) Admin / super_admin (has_role(…, 'admin')) peuvent supprimer tout message dans un contexte
--    où la politique SELECT « Users can read own or group messages » leur permettrait de le lire
--    (évite la suppression « à vide » avec toast de succès alors que RLS bloque).

DROP POLICY IF EXISTS "Sender can delete unread messages" ON public.messages;

CREATE POLICY "Sender can delete own messages"
  ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Admins can delete visible messages"
  ON public.messages FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND (
      auth.uid() = sender_id
      OR auth.uid() = recipient_id
      OR (
        group_id IS NOT NULL
        AND public.is_member_of_conversation_group(group_id)
      )
      OR (
        group_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.conversation_groups cg
          WHERE cg.id = messages.group_id
            AND cg.is_public = true
        )
      )
      OR (
        group_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.conversation_groups cg
          WHERE cg.id = messages.group_id
            AND cg.salon_access_rule = 'min_staff_rank'
            AND cg.salon_min_staff_rank IS NOT NULL
            AND public.staff_rank(auth.uid()) >= cg.salon_min_staff_rank
        )
      )
      OR (
        group_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.conversation_groups cg
          WHERE cg.id = messages.group_id
            AND cg.salon_access_rule = 'permission'
            AND cg.salon_required_permission IS NOT NULL
            AND public.user_has_permission(auth.uid(), cg.salon_required_permission)
        )
      )
    )
  );
