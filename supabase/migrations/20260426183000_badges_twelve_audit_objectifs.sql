-- Réduit le catalogue de badges à 12 entrées (audits + objectifs perso + objectif équipe).
-- Supprime les paliers audit_milestone_* (20→500) et les badges streak / suivi / niveau / note parfaite.

DELETE FROM public.badges
WHERE key ~ '^audit_milestone_'
   OR key IN (
     'streak_3',
     'streak_7',
     'streak_30',
     'perfect_10',
     'suivi_5',
     'suivi_20',
     'level_5',
     'level_10'
   );

INSERT INTO public.badges (key, label, description, icon, category, threshold)
VALUES
  ('first_audit', 'Premier audit', 'Réaliser votre premier audit', '🎯', 'audit', 1),
  ('audit_10', '10 audits', '10 audits réalisés', '🥉', 'audit', 10),
  ('audit_25', '25 audits', '25 audits réalisés', '🥈', 'audit', 25),
  ('audit_50', '50 audits', '50 audits réalisés', '🥇', 'audit', 50),
  ('audit_75', '75 audits', '75 audits réalisés', '⚡', 'audit', 75),
  ('audit_100', '100 audits', '100 audits réalisés', '💎', 'audit', 100),
  ('audit_150', '150 audits', '150 audits réalisés', '🏅', 'audit', 150),
  ('audit_200', '200 audits', '200 audits réalisés', '👑', 'audit', 200),
  ('objectif_palier_1', 'Palier personnel 1', 'Objectif personnel — palier 1 atteint (année en cours)', '🎖️', 'objectif', 1001),
  ('objectif_palier_2', 'Palier personnel 2', 'Objectif personnel — palier 2 atteint (année en cours)', '🏆', 'objectif', 1002),
  ('objectif_palier_3', 'Palier personnel 3', 'Objectif personnel — palier 3 atteint (année en cours)', '🌟', 'objectif', 1003),
  ('objectif_equipe', 'Objectif équipe', 'Objectif d''équipe atteint (somme des objectifs vs audits OK de l''année)', '🤝', 'equipe', 1100)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  threshold = EXCLUDED.threshold;

CREATE OR REPLACE FUNCTION public.record_activity(p_type text, p_score numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_yesterday date := CURRENT_DATE - 1;
  v_existing record;
  v_streak record;
  v_xp_gain int;
  v_new_xp int;
  v_new_level int;
  v_new_current_streak int;
  v_badge record;
  v_earned_badge_ids uuid[] := '{}';
  v_audits_year int := 0;
  v_team_audits int := 0;
  v_team_target int := 0;
  v_palier_1 int;
  v_palier_2 int;
  v_palier_3 int;
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_type NOT IN ('audit', 'suivi') THEN
    RAISE EXCEPTION 'Invalid activity type';
  END IF;

  v_xp_gain := CASE WHEN p_type = 'audit' THEN 50 ELSE 30 END;

  SELECT palier_1, palier_2, palier_3
  INTO v_palier_1, v_palier_2, v_palier_3
  FROM public.collaborateur_config
  WHERE user_id = v_user_id;

  SELECT COALESCE(SUM(objectif), 0)::int
  INTO v_team_target
  FROM public.collaborateur_config;

  SELECT COUNT(*)::int
  INTO v_team_audits
  FROM public.audits
  WHERE statut = 'OK'
    AND EXTRACT(YEAR FROM date::date) = v_year;

  SELECT COUNT(*)::int
  INTO v_audits_year
  FROM public.audits a
  INNER JOIN public.profiles p ON p.user_id = v_user_id
  WHERE a.statut = 'OK'
    AND EXTRACT(YEAR FROM a.date::date) = v_year
    AND a.auditeur = p.display_name;

  SELECT * INTO v_existing FROM user_streaks WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date,
      total_audits, total_suivis, level, xp)
    VALUES (v_user_id, 1, 1, v_today,
      CASE WHEN p_type = 'audit' THEN 1 ELSE 0 END,
      CASE WHEN p_type = 'suivi' THEN 1 ELSE 0 END,
      1, v_xp_gain)
    RETURNING * INTO v_streak;
  ELSE
    v_new_current_streak := CASE
      WHEN v_existing.last_activity_date = v_today THEN v_existing.current_streak
      WHEN v_existing.last_activity_date = v_yesterday THEN v_existing.current_streak + 1
      ELSE 1
    END;
    v_new_xp := v_existing.xp + v_xp_gain;
    v_new_level := (v_new_xp / 200) + 1;

    UPDATE user_streaks SET
      current_streak = v_new_current_streak,
      longest_streak = GREATEST(v_existing.longest_streak, v_new_current_streak),
      last_activity_date = v_today,
      total_audits = v_existing.total_audits + CASE WHEN p_type = 'audit' THEN 1 ELSE 0 END,
      total_suivis = v_existing.total_suivis + CASE WHEN p_type = 'suivi' THEN 1 ELSE 0 END,
      xp = v_new_xp,
      level = v_new_level
    WHERE user_id = v_user_id
    RETURNING * INTO v_streak;
  END IF;

  FOR v_badge IN SELECT * FROM badges ORDER BY threshold LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = v_badge.id
    );

    IF (v_badge.key = 'first_audit' AND v_streak.total_audits >= 1)
      OR (v_badge.key = 'audit_10' AND v_streak.total_audits >= 10)
      OR (v_badge.key = 'audit_25' AND v_streak.total_audits >= 25)
      OR (v_badge.key = 'audit_50' AND v_streak.total_audits >= 50)
      OR (v_badge.key = 'audit_75' AND v_streak.total_audits >= 75)
      OR (v_badge.key = 'audit_100' AND v_streak.total_audits >= 100)
      OR (v_badge.key = 'audit_150' AND v_streak.total_audits >= 150)
      OR (v_badge.key = 'audit_200' AND v_streak.total_audits >= 200)
      OR (v_badge.key = 'objectif_palier_1' AND v_palier_1 IS NOT NULL AND v_palier_1 > 0 AND v_audits_year >= v_palier_1)
      OR (v_badge.key = 'objectif_palier_2' AND v_palier_2 IS NOT NULL AND v_palier_2 > 0 AND v_audits_year >= v_palier_2)
      OR (v_badge.key = 'objectif_palier_3' AND v_palier_3 IS NOT NULL AND v_palier_3 > 0 AND v_audits_year >= v_palier_3)
      OR (v_badge.key = 'objectif_equipe' AND v_team_target > 0 AND v_team_audits >= v_team_target)
    THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (v_user_id, v_badge.id)
      ON CONFLICT DO NOTHING;
      v_earned_badge_ids := v_earned_badge_ids || v_badge.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'streak', row_to_json(v_streak),
    'new_badge_ids', to_jsonb(v_earned_badge_ids)
  );
END;
$$;
