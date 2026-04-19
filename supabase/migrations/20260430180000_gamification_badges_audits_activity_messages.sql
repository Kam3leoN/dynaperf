-- Gamification v2 : paliers audits (dont 125, 175), suivis d’activité, messages, objectifs.
-- + colonne total_messages_sent sur user_streaks.

ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS total_messages_sent integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_streaks.total_messages_sent IS 'Nombre de messages envoyés (une action d’envoi = +1, pas une ligne par destinataire groupe).';

-- Catalogue badges (UPSERT par clé)
INSERT INTO public.badges (key, label, description, icon, category, threshold) VALUES
  -- Audits (volume = total_audits côté user_streaks)
  ('first_audit', 'Premier audit', 'Réaliser votre premier audit', '🎯', 'audit', 1),
  ('audit_10', '10 audits', '10 audits réalisés', '🥉', 'audit', 10),
  ('audit_25', '25 audits', '25 audits réalisés', '🥈', 'audit', 25),
  ('audit_50', '50 audits', '50 audits réalisés', '🥇', 'audit', 50),
  ('audit_75', '75 audits', '75 audits réalisés', '⚡', 'audit', 75),
  ('audit_100', '100 audits', '100 audits réalisés', '💎', 'audit', 100),
  ('audit_125', '125 audits', '125 audits réalisés', '🔷', 'audit', 125),
  ('audit_150', '150 audits', '150 audits réalisés', '🏅', 'audit', 150),
  ('audit_175', '175 audits', '175 audits réalisés', '💠', 'audit', 175),
  ('audit_200', '200 audits', '200 audits réalisés', '👑', 'audit', 200),
  -- Suivis d’activité (total_suivis)
  ('first_activity', 'Premier suivi d’activité', 'Réaliser votre premier suivi d’activité', '📋', 'activite', 1),
  ('activity_10', '10 suivis', '10 suivis d’activité réalisés', '📝', 'activite', 10),
  ('activity_50', '50 suivis', '50 suivis d’activité réalisés', '📊', 'activite', 50),
  ('activity_100', '100 suivis', '100 suivis d’activité réalisés', '📈', 'activite', 100),
  ('activity_150', '150 suivis', '150 suivis d’activité réalisés', '⭐', 'activite', 150),
  ('activity_200', '200 suivis', '200 suivis d’activité réalisés', '🌟', 'activite', 200),
  ('activity_250', '250 suivis', '250 suivis d’activité réalisés', '✨', 'activite', 250),
  ('activity_300', '300 suivis', '300 suivis d’activité réalisés', '🔆', 'activite', 300),
  ('activity_350', '350 suivis', '350 suivis d’activité réalisés', '💫', 'activite', 350),
  ('activity_400', '400 suivis', '400 suivis d’activité réalisés', '🏆', 'activite', 400),
  -- Messages (total_messages_sent)
  ('first_message', 'Premier message', 'Envoyer votre premier message', '💬', 'messages', 1),
  ('message_3', '3 messages', '3 messages envoyés', '🗨️', 'messages', 3),
  ('message_10', '10 messages', '10 messages envoyés', '📣', 'messages', 10),
  ('message_25', '25 messages', '25 messages envoyés', '📢', 'messages', 25),
  ('message_50', '50 messages', '50 messages envoyés', '📯', 'messages', 50),
  ('message_75', '75 messages', '75 messages envoyés', '🔔', 'messages', 75),
  ('message_100', '100 messages', '100 messages envoyés', '🎙️', 'messages', 100),
  ('message_250', '250 messages', '250 messages envoyés', '🎤', 'messages', 250),
  ('message_500', '500 messages', '500 messages envoyés', '📻', 'messages', 500),
  ('message_1000', 'Causeur de l’extrême', '1000 messages envoyés — causeur de l’extrême', '🏅', 'messages', 1000),
  -- Objectifs (inchangés, seuils d’affichage élevés)
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

  IF p_type NOT IN ('audit', 'suivi', 'message') THEN
    RAISE EXCEPTION 'Invalid activity type';
  END IF;

  v_xp_gain := CASE
    WHEN p_type = 'audit' THEN 50
    WHEN p_type = 'suivi' THEN 30
    ELSE 5
  END;

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
    INSERT INTO user_streaks (
      user_id, current_streak, longest_streak, last_activity_date,
      total_audits, total_suivis, total_messages_sent, level, xp
    )
    VALUES (
      v_user_id, 1, 1, v_today,
      CASE WHEN p_type = 'audit' THEN 1 ELSE 0 END,
      CASE WHEN p_type = 'suivi' THEN 1 ELSE 0 END,
      CASE WHEN p_type = 'message' THEN 1 ELSE 0 END,
      1, v_xp_gain
    )
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
      total_messages_sent = v_existing.total_messages_sent + CASE WHEN p_type = 'message' THEN 1 ELSE 0 END,
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
      OR (v_badge.key = 'audit_125' AND v_streak.total_audits >= 125)
      OR (v_badge.key = 'audit_150' AND v_streak.total_audits >= 150)
      OR (v_badge.key = 'audit_175' AND v_streak.total_audits >= 175)
      OR (v_badge.key = 'audit_200' AND v_streak.total_audits >= 200)
      OR (v_badge.key = 'first_activity' AND v_streak.total_suivis >= 1)
      OR (v_badge.key = 'activity_10' AND v_streak.total_suivis >= 10)
      OR (v_badge.key = 'activity_50' AND v_streak.total_suivis >= 50)
      OR (v_badge.key = 'activity_100' AND v_streak.total_suivis >= 100)
      OR (v_badge.key = 'activity_150' AND v_streak.total_suivis >= 150)
      OR (v_badge.key = 'activity_200' AND v_streak.total_suivis >= 200)
      OR (v_badge.key = 'activity_250' AND v_streak.total_suivis >= 250)
      OR (v_badge.key = 'activity_300' AND v_streak.total_suivis >= 300)
      OR (v_badge.key = 'activity_350' AND v_streak.total_suivis >= 350)
      OR (v_badge.key = 'activity_400' AND v_streak.total_suivis >= 400)
      OR (v_badge.key = 'first_message' AND v_streak.total_messages_sent >= 1)
      OR (v_badge.key = 'message_3' AND v_streak.total_messages_sent >= 3)
      OR (v_badge.key = 'message_10' AND v_streak.total_messages_sent >= 10)
      OR (v_badge.key = 'message_25' AND v_streak.total_messages_sent >= 25)
      OR (v_badge.key = 'message_50' AND v_streak.total_messages_sent >= 50)
      OR (v_badge.key = 'message_75' AND v_streak.total_messages_sent >= 75)
      OR (v_badge.key = 'message_100' AND v_streak.total_messages_sent >= 100)
      OR (v_badge.key = 'message_250' AND v_streak.total_messages_sent >= 250)
      OR (v_badge.key = 'message_500' AND v_streak.total_messages_sent >= 500)
      OR (v_badge.key = 'message_1000' AND v_streak.total_messages_sent >= 1000)
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
