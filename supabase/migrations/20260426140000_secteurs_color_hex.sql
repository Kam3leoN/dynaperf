-- Couleur d’identification par secteur (carte admin, légende).

ALTER TABLE public.secteurs
  ADD COLUMN IF NOT EXISTS color_hex text;

COMMENT ON COLUMN public.secteurs.color_hex IS 'Couleur hex (#rrggbb) pour la carte et la légende.';
