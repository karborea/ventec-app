-- Allow PDFs in the soumission-files bucket. Generated quotes are
-- stored alongside the user-uploaded installation images.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/avif',
  'application/pdf'
]
WHERE id = 'soumission-files';
