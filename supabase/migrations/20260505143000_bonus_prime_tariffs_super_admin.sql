-- Barèmes primes bonus (DynaPerf) par année — accès exclusif super_admin (UI : /admin/primes).

CREATE TABLE public.bonus_prime_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE,
  tariff_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.bonus_prime_tariffs IS 'Barèmes / paramètres primes bonus par exercice — réservé super_admin (RLS).';

CREATE INDEX bonus_prime_tariffs_year_idx ON public.bonus_prime_tariffs (year DESC);

ALTER TABLE public.bonus_prime_tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bonus_prime_tariffs_select_super_admin"
  ON public.bonus_prime_tariffs FOR SELECT TO authenticated
  USING (public.has_role (auth.uid (), 'super_admin'::public.app_role));

CREATE POLICY "bonus_prime_tariffs_insert_super_admin"
  ON public.bonus_prime_tariffs FOR INSERT TO authenticated
  WITH CHECK (public.has_role (auth.uid (), 'super_admin'::public.app_role));

CREATE POLICY "bonus_prime_tariffs_update_super_admin"
  ON public.bonus_prime_tariffs FOR UPDATE TO authenticated
  USING (public.has_role (auth.uid (), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role (auth.uid (), 'super_admin'::public.app_role));

CREATE POLICY "bonus_prime_tariffs_delete_super_admin"
  ON public.bonus_prime_tariffs FOR DELETE TO authenticated
  USING (public.has_role (auth.uid (), 'super_admin'::public.app_role));
