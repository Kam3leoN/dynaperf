-- Compteur de scans + résolution publique (redirection) sans exposer la table en lecture anonyme.
-- Version dédiée : éviter le doublon de timestamp avec 20260410120000_app_modules_*.sql

ALTER TABLE public.qr_codes
ADD COLUMN IF NOT EXISTS scan_count bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.qr_codes.scan_count IS 'Nombre de visites via le lien de suivi /r/:id';

CREATE OR REPLACE FUNCTION public.qr_resolve_and_track (p_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value text;
BEGIN
  UPDATE public.qr_codes
  SET
    scan_count = scan_count + 1
  WHERE
    id = p_id
  RETURNING
    value INTO v_value;

  RETURN v_value;
END;
$$;

COMMENT ON FUNCTION public.qr_resolve_and_track (uuid) IS 'Incrémente scan_count et renvoie la valeur de redirection (SECURITY DEFINER, appel anon pour /r/:id).';

REVOKE ALL ON FUNCTION public.qr_resolve_and_track (uuid)
FROM
  PUBLIC;

GRANT EXECUTE ON FUNCTION public.qr_resolve_and_track (uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.qr_resolve_and_track (uuid) TO authenticated;
