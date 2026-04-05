-- Présence : défaut « invisible » (hors ligne) au lieu de « online » pour éviter que tout le monde soit vert.
ALTER TABLE public.user_presence
  ALTER COLUMN status SET DEFAULT 'invisible';

UPDATE public.user_presence
SET status = 'invisible', expires_at = NULL
WHERE status = 'online' AND expires_at IS NULL;

COMMENT ON COLUMN public.user_presence.status IS 'online=vert, idle, dnd, invisible=hors ligne affiché';
