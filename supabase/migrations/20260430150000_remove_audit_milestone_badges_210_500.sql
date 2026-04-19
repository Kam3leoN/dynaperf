-- Supprime les badges « palier audits » de 210 à 500 (clés audit_milestone_210 … audit_milestone_500)
-- et les succès utilisateur associés (FK user_badges → CASCADE).

DELETE FROM public.badges
WHERE key ~ '^audit_milestone_[0-9]+$'
  AND (substring(key FROM 'audit_milestone_([0-9]+)'))::integer BETWEEN 210 AND 500;
