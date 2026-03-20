INSERT INTO storage.buckets (id, name, public) VALUES ('audit-photos', 'audit-photos', true);

CREATE POLICY "Authenticated users can upload audit photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audit-photos');

CREATE POLICY "Authenticated users can view audit photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audit-photos');

CREATE POLICY "Authenticated users can delete audit photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'audit-photos');