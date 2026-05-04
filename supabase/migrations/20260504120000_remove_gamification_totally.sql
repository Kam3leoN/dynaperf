-- Retrait total de la gamification (module app, badges, XP / streaks, RPC record_activity).

DELETE FROM public.user_module_overrides WHERE module_key = 'gamification';

DELETE FROM public.app_modules WHERE module_key = 'gamification';

DROP FUNCTION IF EXISTS public.record_activity(text, numeric);

DROP TABLE IF EXISTS public.user_badges CASCADE;

DROP TABLE IF EXISTS public.badges CASCADE;

DROP TABLE IF EXISTS public.user_streaks CASCADE;
