
-- Add 4 time fields for RD Présentiel to audit_details
ALTER TABLE public.audit_details ADD COLUMN heure_debut_prevue text;
ALTER TABLE public.audit_details ADD COLUMN heure_fin_prevue text;
ALTER TABLE public.audit_details ADD COLUMN heure_debut_reelle text;
ALTER TABLE public.audit_details ADD COLUMN heure_fin_reelle text;

-- Add versioning to audit_types
ALTER TABLE public.audit_types ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE public.audit_types ADD COLUMN version_label text DEFAULT 'V1';
ALTER TABLE public.audit_types ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add versioning to suivi_activite_items_config
ALTER TABLE public.suivi_activite_items_config ADD COLUMN config_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.suivi_activite_items_config ADD COLUMN config_version_label text DEFAULT 'V1';
ALTER TABLE public.suivi_activite_items_config ADD COLUMN is_active boolean NOT NULL DEFAULT true;
