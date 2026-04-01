
DROP FUNCTION IF EXISTS public.get_my_config();

CREATE OR REPLACE FUNCTION public.get_my_config()
RETURNS TABLE(
  id uuid, user_id uuid, objectif integer, palier_1 integer, palier_2 integer, palier_3 integer,
  prime_audit_1 numeric, prime_audit_2 numeric, prime_audit_3_plus numeric,
  prime_distanciel_1 numeric, prime_distanciel_2 numeric, prime_distanciel_3_plus numeric,
  prime_club_1 numeric, prime_club_2 numeric, prime_club_3_plus numeric,
  prime_rdv_1 numeric, prime_rdv_2 numeric, prime_rdv_3_plus numeric,
  prime_suivi_1 numeric, prime_suivi_2 numeric, prime_suivi_3_plus numeric,
  prime_mep_1 numeric, prime_mep_2 numeric, prime_mep_3_plus numeric,
  prime_evenementiel_1 numeric, prime_evenementiel_2 numeric, prime_evenementiel_3_plus numeric,
  semaines_indisponibles integer, created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT c.id, c.user_id, c.objectif, c.palier_1, c.palier_2, c.palier_3,
           c.prime_audit_1, c.prime_audit_2, c.prime_audit_3_plus,
           c.prime_distanciel_1, c.prime_distanciel_2, c.prime_distanciel_3_plus,
           c.prime_club_1, c.prime_club_2, c.prime_club_3_plus,
           c.prime_rdv_1, c.prime_rdv_2, c.prime_rdv_3_plus,
           c.prime_suivi_1, c.prime_suivi_2, c.prime_suivi_3_plus,
           c.prime_mep_1, c.prime_mep_2, c.prime_mep_3_plus,
           c.prime_evenementiel_1, c.prime_evenementiel_2, c.prime_evenementiel_3_plus,
           c.semaines_indisponibles,
           c.created_at, c.updated_at
    FROM public.collaborateur_config c
    WHERE c.user_id = auth.uid();
END;
$$;
