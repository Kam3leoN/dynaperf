-- Regroupement logique des envois de groupe : une bulle = un group_send_id partagé par toutes les lignes (une par destinataire).
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS group_send_id uuid;

COMMENT ON COLUMN public.messages.group_send_id IS
  'Identifiant commun pour toutes les lignes créées par un même envoi dans un groupe (recipient_id différent par membre).';

CREATE INDEX IF NOT EXISTS idx_messages_group_recipient_created
  ON public.messages (group_id, recipient_id, created_at DESC)
  WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_dm_pair_created
  ON public.messages (sender_id, recipient_id, created_at DESC)
  WHERE group_id IS NULL;