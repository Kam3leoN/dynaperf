-- =============================================================================
-- Déduplication des clubs (Supabase : SQL Editor, rôle postgres / bypass RLS)
-- À lire entièrement avant exécution. Faire une sauvegarde ou export CSV avant.
-- =============================================================================

-- 0) (Fortement recommandé) Copie de secours
-- CREATE TABLE public.clubs_backup_dedupe AS SELECT * FROM public.clubs;

-- -----------------------------------------------------------------------------
-- A) Aperçu : doublons sur le nom exact (trim + insensible à la casse)
-- -----------------------------------------------------------------------------
-- SELECT lower(trim(nom)) AS clef, count(*) AS nb, array_agg(id ORDER BY created_at) AS ids
-- FROM public.clubs
-- GROUP BY lower(trim(nom))
-- HAVING count(*) > 1
-- ORDER BY nb DESC;

-- -----------------------------------------------------------------------------
-- B) Suppression : on garde UNE ligne par clef — la plus ancienne (created_at),
--    puis id min en tie-break. Les autres lignes du même groupe sont DELETE.
-- -----------------------------------------------------------------------------
-- À décommenter et exécuter quand l’aperçu te convient.

/*
WITH ranked AS (
  SELECT
    id,
    lower(trim(nom)) AS nom_key,
    row_number() OVER (
      PARTITION BY lower(trim(nom))
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.clubs
)
DELETE FROM public.clubs c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;
*/

-- -----------------------------------------------------------------------------
-- C) Variante : doublons après retrait du préfixe « DYNABUY CLUB » (comme l’app)
--    Utile si tu as à la fois « DYNABUY CLUB Foo » et « Foo ».
--    Décommenter le bloc suivant à la place de B).
-- -----------------------------------------------------------------------------

/*
WITH normalized AS (
  SELECT
    id,
    lower(
      trim(regexp_replace(trim(nom), '^\s*DYNABUY\s+CLUB\s+', '', 'i'))
    ) AS nom_key,
    created_at
  FROM public.clubs
),
ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY nom_key
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM normalized
  WHERE nom_key <> ''
)
DELETE FROM public.clubs c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;
*/

-- Après suppression : logos orphelins éventuels dans le bucket club-logos
-- (fichiers nommés {uuid}.ext pour des id supprimés) — nettoyage manuel si besoin.
