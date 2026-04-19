-- Module Badges & Gamification (admin + fonctionnalités XP / badges utilisateur)
INSERT INTO public.app_modules (module_key, label, sort_order, is_enabled)
VALUES ('gamification', 'Badges & Gamification', 9, true)
ON CONFLICT (module_key) DO NOTHING;
