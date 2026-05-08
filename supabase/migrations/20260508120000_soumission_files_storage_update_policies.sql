-- Allow upsert overwrites of files in the soumission-files bucket.
-- The storage backend handles `.upload(..., { upsert: true })` on an
-- existing object as an UPDATE on storage.objects, which RLS gates
-- separately from INSERT. Without these policies, regenerating a
-- previously-uploaded PDF (or any overwrite) fails with "new row
-- violates row-level security policy".

CREATE POLICY "soumission_files_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'soumission-files'
    AND EXISTS (
      SELECT 1 FROM public.soumissions s
      WHERE s.id = ((storage.foldername(name))[1])::uuid
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'soumission-files'
    AND EXISTS (
      SELECT 1 FROM public.soumissions s
      WHERE s.id = ((storage.foldername(name))[1])::uuid
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "soumission_files_storage_update_admin"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'soumission-files' AND public.is_admin())
  WITH CHECK (bucket_id = 'soumission-files' AND public.is_admin());
