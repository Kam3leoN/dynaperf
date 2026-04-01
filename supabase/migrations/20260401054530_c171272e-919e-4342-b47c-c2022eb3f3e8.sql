ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;