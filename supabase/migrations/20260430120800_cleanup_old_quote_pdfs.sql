-- Auto-delete quote PDFs older than 30 days from the soumission-files
-- bucket. Installation photos uploaded by clients are NOT touched.
-- The signed URLs we email out are also 30-day, so the link stays
-- valid for its full lifetime.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.cleanup_old_quote_pdfs(retention_days int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  deleted_count int := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM storage.objects
    WHERE bucket_id = 'soumission-files'
      AND name LIKE '%/quote-%.pdf'
      AND created_at < now() - make_interval(days => retention_days)
    RETURNING name
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  UPDATE public.soumissions
  SET pdf_path = NULL
  WHERE pdf_path IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'soumission-files' AND o.name = soumissions.pdf_path
    );

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_quote_pdfs(int) FROM PUBLIC;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-quote-pdfs')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-quote-pdfs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-old-quote-pdfs',
  '0 3 * * *',
  $$SELECT public.cleanup_old_quote_pdfs(30)$$
);
