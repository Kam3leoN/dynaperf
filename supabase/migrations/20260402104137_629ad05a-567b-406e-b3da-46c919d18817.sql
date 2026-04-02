ALTER TABLE public.audit_details
  ADD COLUMN signature_auditeur TEXT DEFAULT NULL,
  ADD COLUMN signature_audite TEXT DEFAULT NULL;

ALTER TABLE public.suivi_activite
  ADD COLUMN signature_auditeur TEXT DEFAULT NULL,
  ADD COLUMN signature_audite TEXT DEFAULT NULL;