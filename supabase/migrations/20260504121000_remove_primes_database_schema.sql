-- Retire le schéma « primes » : colonnes collaborateur_config, colonne audits, table user_custom_primes, RPC get_my_config.

ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_custom_prime_id_fkey;
ALTER TABLE public.audits DROP COLUMN IF EXISTS custom_prime_id;

DROP TABLE IF EXISTS public.user_custom_primes;

ALTER TABLE public.collaborateur_config
  DROP COLUMN IF EXISTS prime_audit_1,
  DROP COLUMN IF EXISTS prime_audit_2,
  DROP COLUMN IF EXISTS prime_audit_3_plus,
  DROP COLUMN IF EXISTS prime_distanciel_1,
  DROP COLUMN IF EXISTS prime_distanciel_2,
  DROP COLUMN IF EXISTS prime_distanciel_3_plus,
  DROP COLUMN IF EXISTS prime_club_1,
  DROP COLUMN IF EXISTS prime_club_2,
  DROP COLUMN IF EXISTS prime_club_3_plus,
  DROP COLUMN IF EXISTS prime_rdv_1,
  DROP COLUMN IF EXISTS prime_rdv_2,
  DROP COLUMN IF EXISTS prime_rdv_3_plus,
  DROP COLUMN IF EXISTS prime_suivi_1,
  DROP COLUMN IF EXISTS prime_suivi_2,
  DROP COLUMN IF EXISTS prime_suivi_3_plus,
  DROP COLUMN IF EXISTS prime_mep_1,
  DROP COLUMN IF EXISTS prime_mep_2,
  DROP COLUMN IF EXISTS prime_mep_3_plus,
  DROP COLUMN IF EXISTS prime_evenementiel_1,
  DROP COLUMN IF EXISTS prime_evenementiel_2,
  DROP COLUMN IF EXISTS prime_evenementiel_3_plus;

DROP FUNCTION IF EXISTS public.get_my_config();

CREATE OR REPLACE FUNCTION public.get_my_config()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  objectif integer,
  palier_1 integer,
  palier_2 integer,
  palier_3 integer,
  semaines_indisponibles integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT
      c.id,
      c.user_id,
      c.objectif,
      c.palier_1,
      c.palier_2,
      c.palier_3,
      c.semaines_indisponibles,
      c.created_at,
      c.updated_at
    FROM public.collaborateur_config c
    WHERE c.user_id = auth.uid();
END;
$$;
