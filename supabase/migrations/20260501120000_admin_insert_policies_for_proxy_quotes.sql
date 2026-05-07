-- Admin can create soumissions on behalf of any client (proxy mode).
-- Mirrors the existing admin SELECT/UPDATE policies — completes the
-- read+write surface so an admin-as-proxy flow works under regular RLS
-- without needing service role.

CREATE POLICY "soumissions_insert_admin"
  ON public.soumissions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "ouvertures_insert_admin"
  ON public.ouvertures FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "ouvertures_update_admin"
  ON public.ouvertures FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "ouvertures_delete_admin"
  ON public.ouvertures FOR DELETE
  USING (public.is_admin());

CREATE POLICY "soumission_files_insert_admin"
  ON public.soumission_files FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "soumission_files_storage_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'soumission-files' AND public.is_admin()
  );
