-- Table : références aux fichiers (photos d'installation) attachés à une soumission.
CREATE TABLE IF NOT EXISTS public.soumission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_id uuid NOT NULL REFERENCES public.soumissions(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS soumission_files_soumission_id_idx
  ON public.soumission_files (soumission_id);

ALTER TABLE public.soumission_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soumission_files_select" ON public.soumission_files;
CREATE POLICY "soumission_files_select" ON public.soumission_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.soumissions s
      WHERE s.id = soumission_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "soumission_files_insert" ON public.soumission_files;
CREATE POLICY "soumission_files_insert" ON public.soumission_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.soumissions s
      WHERE s.id = soumission_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "soumission_files_delete" ON public.soumission_files;
CREATE POLICY "soumission_files_delete" ON public.soumission_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.soumissions s
      WHERE s.id = soumission_id AND s.user_id = auth.uid()
    )
  );

-- Bucket de stockage privé pour les fichiers d'installation.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'soumission-files',
  'soumission-files',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "soumission_files_storage_select" ON storage.objects;
CREATE POLICY "soumission_files_storage_select" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'soumission-files'
    AND EXISTS (
      SELECT 1 FROM public.soumissions s
      WHERE s.id = ((storage.foldername(name))[1])::uuid
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "soumission_files_storage_insert" ON storage.objects;
CREATE POLICY "soumission_files_storage_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'soumission-files'
    AND EXISTS (
      SELECT 1 FROM public.soumissions s
      WHERE s.id = ((storage.foldername(name))[1])::uuid
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "soumission_files_storage_delete" ON storage.objects;
CREATE POLICY "soumission_files_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'soumission-files'
    AND EXISTS (
      SELECT 1 FROM public.soumissions s
      WHERE s.id = ((storage.foldername(name))[1])::uuid
        AND s.user_id = auth.uid()
    )
  );
