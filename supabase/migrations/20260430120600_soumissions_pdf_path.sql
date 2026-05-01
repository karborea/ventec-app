-- PDF generated at submission time (brouillon → soumis transition).
-- Stored in the soumission-files bucket. Path is null for drafts.

ALTER TABLE public.soumissions ADD COLUMN pdf_path text;

COMMENT ON COLUMN public.soumissions.pdf_path IS
  'Chemin dans le bucket soumission-files vers le PDF généré au moment de la soumission (status soumis).';
