-- Gamification: badges catalog
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🏆',
  category text NOT NULL DEFAULT 'general',
  threshold integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read badges" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage badges" ON public.badges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- User earned badges
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own badges" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System insert badges" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User streaks tracking
CREATE TABLE public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  total_audits integer NOT NULL DEFAULT 0,
  total_suivis integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own streaks" ON public.user_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own streaks" ON public.user_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed default badges
INSERT INTO public.badges (key, label, description, icon, category, threshold) VALUES
  ('first_audit', 'Premier Audit', 'Réaliser son premier audit', '🎯', 'audit', 1),
  ('audit_10', 'Auditeur Bronze', '10 audits réalisés', '🥉', 'audit', 10),
  ('audit_25', 'Auditeur Argent', '25 audits réalisés', '🥈', 'audit', 25),
  ('audit_50', 'Auditeur Or', '50 audits réalisés', '🥇', 'audit', 50),
  ('audit_100', 'Auditeur Platine', '100 audits réalisés', '💎', 'audit', 100),
  ('streak_3', 'En forme !', '3 jours consécutifs d''activité', '🔥', 'streak', 3),
  ('streak_7', 'Semaine parfaite', '7 jours consécutifs', '⚡', 'streak', 7),
  ('streak_30', 'Machine !', '30 jours consécutifs', '🚀', 'streak', 30),
  ('perfect_10', 'Note parfaite', 'Obtenir un 10/10 sur un audit', '⭐', 'quality', 1),
  ('suivi_5', 'Suiveur assidu', '5 suivis d''activité réalisés', '📊', 'suivi', 5),
  ('suivi_20', 'Expert suivi', '20 suivis d''activité', '📈', 'suivi', 20),
  ('level_5', 'Niveau 5', 'Atteindre le niveau 5', '🏅', 'level', 5),
  ('level_10', 'Niveau 10', 'Atteindre le niveau 10', '👑', 'level', 10);