
-- 1. Add created_by column to audits
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- 2. Add created_by column to suivi_activite
ALTER TABLE public.suivi_activite ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- 3. Replace permissive INSERT policy on audits
DROP POLICY IF EXISTS "Authenticated users can insert audits" ON public.audits;
CREATE POLICY "Authenticated users can insert audits"
  ON public.audits FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 4. Replace permissive INSERT policy on suivi_activite
DROP POLICY IF EXISTS "Authenticated users can insert suivi_activite" ON public.suivi_activite;
CREATE POLICY "Authenticated users can insert suivi_activite"
  ON public.suivi_activite FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
