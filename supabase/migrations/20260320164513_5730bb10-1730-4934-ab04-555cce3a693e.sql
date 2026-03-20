ALTER TABLE public.audit_items_config ADD COLUMN auto_field text DEFAULT NULL;

UPDATE public.audit_items_config SET auto_field = 'nbParticipants' WHERE id = '425beffb-3b9f-48fe-887c-c2aac79387f0';
UPDATE public.audit_items_config SET auto_field = 'nbInvites' WHERE id = '327d9a53-d7ec-4473-adad-18eaf573b7b6';
UPDATE public.audit_items_config SET auto_field = 'nbNoShow' WHERE id = '15e73e6a-03b4-465e-9d29-371563a29d3a';
UPDATE public.audit_items_config SET auto_field = 'nbRdvPris' WHERE id = '9cec8647-f23a-423a-a28d-bd6dd5818a1e';