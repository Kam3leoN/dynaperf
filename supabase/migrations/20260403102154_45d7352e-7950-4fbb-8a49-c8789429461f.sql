ALTER TABLE public.audit_type_custom_fields 
  ADD COLUMN col_offset_before integer NOT NULL DEFAULT 0,
  ADD COLUMN col_offset_after integer NOT NULL DEFAULT 0;