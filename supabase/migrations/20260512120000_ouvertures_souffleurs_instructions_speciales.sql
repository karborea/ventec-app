-- Optional free-text instructions captured at the "Souffleurs" step.
-- Shown only when manufacturier_origine = ventec for remplacements,
-- and always for nouvelle commande.

ALTER TABLE public.ouvertures
  ADD COLUMN souffleurs_instructions_speciales text;

COMMENT ON COLUMN public.ouvertures.souffleurs_instructions_speciales IS
  'Free-text instructions for the souffleurs installation. Only captured when manufacturier_origine = ventec (or always for nouvelle_commande).';
