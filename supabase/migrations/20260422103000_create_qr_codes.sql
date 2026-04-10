CREATE TABLE IF NOT EXISTS public.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  name text NOT NULL,
  value text NOT NULL,
  size integer NOT NULL DEFAULT 220,
  fg_color text NOT NULL DEFAULT '#111827',
  bg_color text NOT NULL DEFAULT '#ffffff',
  level text NOT NULL DEFAULT 'M',
  logo_url text NULL,
  eye_svg text NULL,
  dot_svg text NULL,
  cover_svg text NULL,
  created_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qr_codes_level_check CHECK (level IN ('L', 'M', 'Q', 'H'))
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_name ON public.qr_codes (name);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON public.qr_codes (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_qr_codes_updated_at ()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_qr_codes_updated_at ON public.qr_codes;
CREATE TRIGGER trg_set_qr_codes_updated_at
BEFORE UPDATE ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.set_qr_codes_updated_at ();

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_codes_select_authenticated"
ON public.qr_codes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "qr_codes_insert_authenticated"
ON public.qr_codes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "qr_codes_update_authenticated"
ON public.qr_codes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "qr_codes_delete_authenticated"
ON public.qr_codes
FOR DELETE
TO authenticated
USING (true);

DO $pub$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'qr_codes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_codes;
  END IF;
END
$pub$;
