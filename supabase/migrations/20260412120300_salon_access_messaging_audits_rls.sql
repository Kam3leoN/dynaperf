-- Salons : règles d’accès (rang staff ou permission nommée) + alignement CRUD salons / messages.
-- Audits & suivi_activite : lecture conditionnée aux permissions nav.*

-- --- conversation_groups : colonnes d’accès ---
ALTER TABLE public.conversation_groups
  ADD COLUMN IF NOT EXISTS salon_access_rule text NOT NULL DEFAULT 'standard';

ALTER TABLE public.conversation_groups
  DROP CONSTRAINT IF EXISTS conversation_groups_salon_access_rule_check;

ALTER TABLE public.conversation_groups
  ADD CONSTRAINT conversation_groups_salon_access_rule_check
  CHECK (salon_access_rule IN ('standard', 'min_staff_rank', 'permission'));

ALTER TABLE public.conversation_groups
  ADD COLUMN IF NOT EXISTS salon_min_staff_rank int NULL;

ALTER TABLE public.conversation_groups
  ADD COLUMN IF NOT EXISTS salon_required_permission text NULL;

ALTER TABLE public.conversation_groups
  ADD CONSTRAINT conversation_groups_salon_required_permission_fkey
  FOREIGN KEY (salon_required_permission) REFERENCES public.app_permissions (key) ON DELETE SET NULL;

COMMENT ON COLUMN public.conversation_groups.salon_access_rule IS
  'standard = logique existante (public / membre / créateur) ; min_staff_rank = staff_rank(uid) >= salon_min_staff_rank ; permission = user_has_permission(uid, salon_required_permission).';

-- --- Lecture groupes ---
DROP POLICY IF EXISTS "Members can read groups" ON public.conversation_groups;

CREATE POLICY "Members can read groups"
  ON public.conversation_groups FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR public.is_member_of_conversation_group(id)
    OR (
      salon_access_rule = 'min_staff_rank'
      AND salon_min_staff_rank IS NOT NULL
      AND public.staff_rank(auth.uid()) >= salon_min_staff_rank
    )
    OR (
      salon_access_rule = 'permission'
      AND salon_required_permission IS NOT NULL
      AND public.user_has_permission(auth.uid(), salon_required_permission)
    )
  );

-- --- Salons publics : création / MAJ / suppression : admin OU messaging.manage_salons ---
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
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.user_has_permission(auth.uid(), 'messaging.manage_salons')
        )
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
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.user_has_permission(auth.uid(), 'messaging.manage_salons')
      )
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
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.user_has_permission(auth.uid(), 'messaging.manage_salons')
      )
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
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.user_has_permission(auth.uid(), 'messaging.manage_salons')
      )
    )
    OR (
      is_public = false
      AND auth.uid() = created_by
    )
  );

-- --- Messages : même visibilité que le groupe (y compris salons étendus) ---
DROP POLICY IF EXISTS "Users can read own or group messages" ON public.messages;

CREATE POLICY "Users can read own or group messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
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
  );

-- --- Audits : lecture selon nav.audits ou lignes créées par l’utilisateur ---
DROP POLICY IF EXISTS "Authenticated users can read audits" ON public.audits;
CREATE POLICY "Authenticated users can read audits"
  ON public.audits FOR SELECT TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'nav.audits')
    OR created_by = auth.uid()
  );

-- --- Suivi activité : lecture selon nav.activite ou créateur ---
DROP POLICY IF EXISTS "Authenticated users can read suivi_activite" ON public.suivi_activite;
CREATE POLICY "Authenticated users can read suivi_activite"
  ON public.suivi_activite FOR SELECT TO authenticated
  USING (
    public.user_has_permission(auth.uid(), 'nav.activite')
    OR created_by = auth.uid()
  );

-- --- Détails d’audit : alignés sur l’accès à la ligne audits parente ---
DROP POLICY IF EXISTS "Authenticated users can read audit_details" ON public.audit_details;
CREATE POLICY "Authenticated users can read audit_details"
  ON public.audit_details FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audits a
      WHERE a.id = audit_details.audit_id
        AND (
          public.user_has_permission(auth.uid(), 'nav.audits')
          OR a.created_by = auth.uid()
        )
    )
  );
