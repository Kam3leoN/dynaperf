-- Définitions SVG / couleurs des statuts de présence (éditables en admin).
-- Étend user_presence avec le statut « stream ».

DO $drop$
DECLARE
  con text;
BEGIN
  SELECT c.conname INTO con
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
  WHERE t.relname = 'user_presence'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND a.attname = 'status'
    AND c.contype = 'c'
  LIMIT 1;
  IF con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_presence DROP CONSTRAINT %I', con);
  END IF;
END
$drop$;

ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_status_check
  CHECK (status IN ('online', 'idle', 'dnd', 'stream', 'invisible'));

COMMENT ON COLUMN public.user_presence.status IS 'online, idle, dnd, stream, invisible ; hors ligne = absence de heartbeat (affichage offline côté client).';

CREATE TABLE IF NOT EXISTS public.presence_status_definitions (
  status_key text NOT NULL PRIMARY KEY,
  label_fr text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  svg_markup text NOT NULL DEFAULT '',
  fill_color text,
  show_on_avatar boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.presence_status_definitions IS 'Libellés et SVG des indicateurs de présence (CRUD admin).';

ALTER TABLE public.presence_status_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read presence_status_definitions" ON public.presence_status_definitions;
CREATE POLICY "Authenticated read presence_status_definitions"
  ON public.presence_status_definitions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage presence_status_definitions" ON public.presence_status_definitions;
CREATE POLICY "Admins manage presence_status_definitions"
  ON public.presence_status_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_presence_status_definitions_updated_at ON public.presence_status_definitions;
CREATE TRIGGER update_presence_status_definitions_updated_at
  BEFORE UPDATE ON public.presence_status_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.presence_status_definitions (status_key, label_fr, sort_order, svg_markup, fill_color, show_on_avatar)
VALUES
  (
    'online',
    'En ligne',
    10,
    $svg$<?xml version="1.0" encoding="UTF-8"?><svg id="Calque_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 499.86 499.86"><path d="m249.93,499.86C111.8,499.86-.1,387.8,0,249.56.1,111.74,112.18-.07,250.17,0c138.08.07,249.82,112.2,249.68,250.55-.14,137.52-112.2,249.3-249.92,249.31Z" stroke-width="0"/></svg>$svg$,
    '#3ba45c',
    true
  ),
  (
    'idle',
    'Inactif',
    20,
    $svg$<?xml version="1.0" encoding="UTF-8"?><svg id="Calque_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 499.91 499.87"><path d="m197.26,5.75c99.03-22.06,213.63,19.42,271.59,123.66,55.64,100.06,35.02,225.53-49.92,304.55-82.91,77.13-209.62,87.91-305.53,25.22C13.7,394.02-13.75,281.02,5.97,197.45c13.68,43.22,40.03,75.24,80.1,95.4,30.64,15.41,63.14,19.66,96.73,13.39,68.74-12.82,119.56-69.3,125.52-139.48,6.07-71.62-38.89-139.24-111.05-161.01Z" stroke-width="0"/></svg>$svg$,
    '#f9a51a',
    true
  ),
  (
    'dnd',
    'Ne pas déranger',
    30,
    $svg$<?xml version="1.0" encoding="UTF-8"?><svg id="Calque_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 499.86 499.86"><path d="m249.75,499.86C111.81,499.77-.03,387.83,0,249.88.03,111.73,112.17-.2,250.36,0c137.91.2,249.63,112.25,249.5,250.24-.13,137.91-112.14,249.7-250.11,249.62Zm.45-289.92c-64.46,0-128.92,0-193.37,0-6.72,0-6.83.11-6.84,6.61,0,22.32,0,44.64,0,66.96,0,6.22.19,6.4,6.54,6.4,128.92,0,257.83,0,386.75,0,6.49,0,6.59-.12,6.59-6.86,0-21.99,0-43.97,0-65.96q0-7.15-7.3-7.16c-64.12,0-128.25,0-192.37,0Z" stroke-width="0"/></svg>$svg$,
    '#ee4540',
    true
  ),
  (
    'stream',
    'En diffusion',
    40,
    $svg$<?xml version="1.0" encoding="UTF-8"?><svg id="Calque_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 499.79 499.85"><path d="m250,499.85C111.92,499.87-.03,387.86,0,249.74.03,111.76,112.18-.1,250.38,0c137.9.1,249.79,112.32,249.41,250.65-.37,137.28-111.04,248.72-249.8,249.2Zm-99.14-75.55c92.4-59.99,183.59-119.18,275.27-178.69-92.26-56.84-183.82-113.26-275.27-169.6v348.29Z" stroke-width="0"/></svg>$svg$,
    '#593694',
    true
  ),
  (
    'invisible',
    'Invisible',
    50,
    '',
    NULL,
    false
  ),
  (
    'offline',
    'Hors ligne',
    60,
    $svg$<?xml version="1.0" encoding="UTF-8"?><svg id="Calque_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 499.86 499.86"><path d="m499.86,249.95c0,137.95-111.88,249.86-249.82,249.91C111.88,499.91-.14,387.82,0,249.66.14,111.72,112.11-.07,250.08,0c137.94.07,249.79,112,249.78,249.95Zm-409.88-.06c.3,89.01,71.92,160.27,160.78,160,88.09-.28,159.33-72.2,159.12-160.66-.21-88.51-72.34-159.62-161.54-159.25-87.09.36-158.67,72.63-158.37,159.91Z" stroke-width="0"/></svg>$svg$,
    '#8c95a0',
    true
  )
ON CONFLICT (status_key) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  sort_order = EXCLUDED.sort_order,
  svg_markup = EXCLUDED.svg_markup,
  fill_color = EXCLUDED.fill_color,
  show_on_avatar = EXCLUDED.show_on_avatar,
  updated_at = now();
