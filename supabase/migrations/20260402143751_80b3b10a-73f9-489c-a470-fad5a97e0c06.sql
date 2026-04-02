
ALTER TABLE public.drive_documents 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS updated_by TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Add updated_by and updated_at to drive_categories too
ALTER TABLE public.drive_categories
ADD COLUMN IF NOT EXISTS updated_by TEXT;
