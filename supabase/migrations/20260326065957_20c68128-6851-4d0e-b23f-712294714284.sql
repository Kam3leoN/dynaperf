
ALTER TABLE public.audit_items_config ADD COLUMN IF NOT EXISTS interets text NOT NULL DEFAULT '';
ALTER TABLE public.audit_items_config ADD COLUMN IF NOT EXISTS comment_y_parvenir text NOT NULL DEFAULT '';
