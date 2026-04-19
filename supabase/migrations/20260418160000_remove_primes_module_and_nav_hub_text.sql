-- Retire le module applicatif « primes » (hors produit) et met à jour la description nav.hub.
DELETE FROM public.app_modules WHERE module_key = 'primes';

UPDATE public.app_permissions
SET description = 'Hub, préférences, profil, notifications (zone accueil)'
WHERE key = 'nav.hub';
