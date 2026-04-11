-- Style QR (yeux / points / cadre) stocké en JSON pour qr-code-styling côté client.
ALTER TABLE public.qr_codes
ADD COLUMN IF NOT EXISTS qr_style jsonb NULL;
