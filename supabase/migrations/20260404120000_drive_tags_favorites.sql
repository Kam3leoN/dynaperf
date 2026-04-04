-- Tags (recherche / filtrage) et favoris pour le Drive
ALTER TABLE public.drive_documents
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_drive_documents_tags ON public.drive_documents USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_drive_documents_is_favorite ON public.drive_documents (is_favorite) WHERE is_favorite = true;
