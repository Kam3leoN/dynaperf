-- Variantes clair / sombre pour le logo et l’icône 512 (rétrocompatibilité avec logo_url / icon_512_url).

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS logo_light_url text,
  ADD COLUMN IF NOT EXISTS logo_dark_url text,
  ADD COLUMN IF NOT EXISTS icon_512_light_url text,
  ADD COLUMN IF NOT EXISTS icon_512_dark_url text;

UPDATE public.app_settings
SET
  logo_light_url = COALESCE(logo_light_url, logo_url),
  icon_512_light_url = COALESCE(icon_512_light_url, icon_512_url)
WHERE id = 1;

COMMENT ON COLUMN public.app_settings.logo_light_url IS 'Logo version thème clair (ou défaut si dark absent).';
COMMENT ON COLUMN public.app_settings.logo_dark_url IS 'Logo version thème sombre.';
COMMENT ON COLUMN public.app_settings.icon_512_light_url IS 'Icône PWA / grand format — thème clair.';
COMMENT ON COLUMN public.app_settings.icon_512_dark_url IS 'Icône PWA / grand format — thème sombre.';
