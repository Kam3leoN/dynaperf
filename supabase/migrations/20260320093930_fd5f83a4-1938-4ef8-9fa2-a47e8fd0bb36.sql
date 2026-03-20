
-- Create a security definer function that returns user config
-- hiding prime columns for non-admin users
CREATE OR REPLACE FUNCTION public.get_my_config()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  objectif integer,
  palier_1 integer,
  palier_2 integer,
  palier_3 integer,
  prime_audit_1 numeric,
  prime_audit_2 numeric,
  prime_audit_3_plus numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY
      SELECT c.id, c.user_id, c.objectif, c.palier_1, c.palier_2, c.palier_3,
             c.prime_audit_1, c.prime_audit_2, c.prime_audit_3_plus,
             c.created_at, c.updated_at
      FROM public.collaborateur_config c
      WHERE c.user_id = auth.uid();
  ELSE
    RETURN QUERY
      SELECT c.id, c.user_id, c.objectif, c.palier_1, c.palier_2, c.palier_3,
             0::numeric AS prime_audit_1, 0::numeric AS prime_audit_2, 0::numeric AS prime_audit_3_plus,
             c.created_at, c.updated_at
      FROM public.collaborateur_config c
      WHERE c.user_id = auth.uid();
  END IF;
END;
$$;
