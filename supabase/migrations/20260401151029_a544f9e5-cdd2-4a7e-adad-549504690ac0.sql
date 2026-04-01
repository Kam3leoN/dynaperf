
DROP FUNCTION IF EXISTS public.get_my_config();

CREATE OR REPLACE FUNCTION public.get_my_config()
 RETURNS TABLE(
   id uuid, user_id uuid, objectif integer, 
   palier_1 integer, palier_2 integer, palier_3 integer,
   prime_audit_1 numeric, prime_audit_2 numeric, prime_audit_3_plus numeric,
   prime_distanciel_1 numeric, prime_distanciel_2 numeric, prime_distanciel_3_plus numeric,
   semaines_indisponibles integer,
   created_at timestamp with time zone, updated_at timestamp with time zone
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY
      SELECT c.id, c.user_id, c.objectif, c.palier_1, c.palier_2, c.palier_3,
             c.prime_audit_1, c.prime_audit_2, c.prime_audit_3_plus,
             c.prime_distanciel_1, c.prime_distanciel_2, c.prime_distanciel_3_plus,
             c.semaines_indisponibles,
             c.created_at, c.updated_at
      FROM public.collaborateur_config c
      WHERE c.user_id = auth.uid();
  ELSE
    RETURN QUERY
      SELECT c.id, c.user_id, c.objectif, c.palier_1, c.palier_2, c.palier_3,
             0::numeric, 0::numeric, 0::numeric,
             0::numeric, 0::numeric, 0::numeric,
             c.semaines_indisponibles,
             c.created_at, c.updated_at
      FROM public.collaborateur_config c
      WHERE c.user_id = auth.uid();
  END IF;
END;
$function$;
