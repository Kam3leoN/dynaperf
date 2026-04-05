-- Ordre d’affichage stable des salons / groupes dans la colonne messagerie (pas de tri par dernière activité).
-- Réordonnancement réservé aux utilisateurs avec la permission messaging.manage_salons.

ALTER TABLE public.conversation_groups
  ADD COLUMN IF NOT EXISTS nav_sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.conversation_groups.nav_sort_order IS
  'Ordre dans la liste messagerie (salons et groupes séparément) ; géré par reorder_messaging_channels.';

-- Rétrocompat : ordre initial déterministe par nom
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY name COLLATE "C") AS rn
  FROM public.conversation_groups
  WHERE is_public = true AND kind = 'salon'
)
UPDATE public.conversation_groups cg
SET nav_sort_order = ranked.rn
FROM ranked
WHERE cg.id = ranked.id;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY name COLLATE "C") AS rn
  FROM public.conversation_groups
  WHERE is_public = false AND kind = 'group'
)
UPDATE public.conversation_groups cg
SET nav_sort_order = ranked.rn
FROM ranked
WHERE cg.id = ranked.id;

CREATE OR REPLACE FUNCTION public.reorder_messaging_channels(
  p_public_salon_ids uuid[],
  p_private_group_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
BEGIN
  IF NOT public.user_has_permission(auth.uid(), 'messaging.manage_salons') THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  IF p_public_salon_ids IS NOT NULL AND cardinality(p_public_salon_ids) > 0 THEN
    FOR i IN 1..array_length(p_public_salon_ids, 1) LOOP
      UPDATE public.conversation_groups
      SET nav_sort_order = i, updated_at = now()
      WHERE id = p_public_salon_ids[i] AND is_public = true AND kind = 'salon';
    END LOOP;
  END IF;

  IF p_private_group_ids IS NOT NULL AND cardinality(p_private_group_ids) > 0 THEN
    FOR i IN 1..array_length(p_private_group_ids, 1) LOOP
      UPDATE public.conversation_groups
      SET nav_sort_order = i, updated_at = now()
      WHERE id = p_private_group_ids[i] AND is_public = false AND kind = 'group';
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_messaging_channels(uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_messaging_channels(uuid[], uuid[]) TO authenticated;
