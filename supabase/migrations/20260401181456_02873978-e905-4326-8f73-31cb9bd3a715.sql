
CREATE TABLE public.user_custom_primes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  prime_1 NUMERIC NOT NULL DEFAULT 75,
  prime_2 NUMERIC NOT NULL DEFAULT 10,
  prime_3_plus NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_custom_primes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all custom primes" ON public.user_custom_primes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own custom primes" ON public.user_custom_primes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
