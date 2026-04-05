-- Étape 2/2 : migration des données user_roles, contrainte unique, staff_role_rank, handle_new_user.
-- À appliquer après 20260412120000 (les valeurs member, moderator, bot, super_moderator existent).

-- --- Données existantes ---
UPDATE public.user_roles SET role = 'member'::public.app_role
WHERE role::text IN ('lecteur', 'user');

UPDATE public.user_roles SET role = 'moderator'::public.app_role
WHERE role::text = 'redacteur';

-- --- Dédupliquer : garder le rôle le plus élevé (score décroissant) ---
DELETE FROM public.user_roles ur
USING (
  SELECT id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE role::text
          WHEN 'super_admin' THEN 100
          WHEN 'admin' THEN 90
          WHEN 'super_moderator' THEN 75
          WHEN 'moderator' THEN 55
          WHEN 'redacteur' THEN 54
          WHEN 'bot' THEN 40
          WHEN 'user' THEN 25
          WHEN 'lecteur' THEN 25
          WHEN 'member' THEN 20
          ELSE 0
        END DESC,
        id
    ) AS rn
  FROM public.user_roles
) ranked
WHERE ur.id = ranked.id AND ranked.rn > 1;

-- --- Profils sans rôle → member ---
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'member'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id);

-- --- Contrainte une ligne par utilisateur ---
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- --- Table de rang (référence pour RLS / salons) ---
CREATE TABLE IF NOT EXISTS public.staff_role_rank (
  role public.app_role PRIMARY KEY,
  rank int NOT NULL,
  CONSTRAINT staff_role_rank_rank_positive CHECK (rank > 0)
);

INSERT INTO public.staff_role_rank (role, rank) VALUES
  ('super_admin', 100),
  ('admin', 90),
  ('super_moderator', 75),
  ('moderator', 55),
  ('redacteur', 54),
  ('bot', 40),
  ('user', 25),
  ('lecteur', 25),
  ('member', 20)
ON CONFLICT (role) DO UPDATE SET rank = EXCLUDED.rank;

ALTER TABLE public.staff_role_rank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read staff_role_rank" ON public.staff_role_rank;
CREATE POLICY "Authenticated read staff_role_rank"
  ON public.staff_role_rank FOR SELECT TO authenticated USING (true);

-- --- staff_rank(user_id) ---
CREATE OR REPLACE FUNCTION public.staff_rank(_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT r.rank
      FROM public.user_roles ur
      JOIN public.staff_role_rank r ON r.role = ur.role
      WHERE ur.user_id = _user_id
      LIMIT 1
    ),
    0
  );
$$;

REVOKE ALL ON FUNCTION public.staff_rank(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_rank(uuid) TO authenticated;

-- --- Nouveaux utilisateurs : member par défaut ; cmalzat → super_admin ---
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_presence (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  IF NEW.email = 'cmalzat@dynabuy.fr' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member'::public.app_role)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
