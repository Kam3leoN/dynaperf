-- 1) Notifications : les utilisateurs peuvent créer leurs propres notifications (ex. audit terminé)
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) Badges « palier tous les 10 » (20→500), en excluant 50 et 100 déjà couverts par audit_50 / audit_100
INSERT INTO public.badges (key, label, description, icon, category, threshold)
SELECT
  'audit_milestone_' || n,
  'Palier ' || n || ' audits',
  'Atteindre ' || n || ' audits complétés',
  '🔟',
  'audit',
  n
FROM generate_series(20, 500, 10) AS n
WHERE n NOT IN (50, 100)
ON CONFLICT (key) DO NOTHING;

-- 3) record_activity : prendre en compte les clés audit_milestone_*
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
  v_milestone int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_type NOT IN ('audit', 'suivi') THEN
    RAISE EXCEPTION 'Invalid activity type';
  END IF;

  v_xp_gain := CASE WHEN p_type = 'audit' THEN 50 ELSE 30 END;

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

  FOR v_badge IN SELECT * FROM badges LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = v_badge.id
    );

    v_milestone := NULL;
    IF v_badge.key ~ '^audit_milestone_[0-9]+$' THEN
      v_milestone := (substring(v_badge.key from 'audit_milestone_([0-9]+)'))::integer;
    END IF;

    IF (v_badge.key = 'first_audit' AND v_streak.total_audits >= 1)
      OR (v_badge.key = 'audit_10' AND v_streak.total_audits >= 10)
      OR (v_badge.key = 'audit_25' AND v_streak.total_audits >= 25)
      OR (v_badge.key = 'audit_50' AND v_streak.total_audits >= 50)
      OR (v_badge.key = 'audit_100' AND v_streak.total_audits >= 100)
      OR (v_milestone IS NOT NULL AND v_streak.total_audits >= v_milestone)
      OR (v_badge.key = 'streak_3' AND v_streak.current_streak >= 3)
      OR (v_badge.key = 'streak_7' AND v_streak.current_streak >= 7)
      OR (v_badge.key = 'streak_30' AND v_streak.current_streak >= 30)
      OR (v_badge.key = 'perfect_10' AND p_type = 'audit' AND p_score IS NOT NULL AND round(p_score::numeric, 1) >= 10)
      OR (v_badge.key = 'suivi_5' AND v_streak.total_suivis >= 5)
      OR (v_badge.key = 'suivi_20' AND v_streak.total_suivis >= 20)
      OR (v_badge.key = 'level_5' AND v_streak.level >= 5)
      OR (v_badge.key = 'level_10' AND v_streak.level >= 10)
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
