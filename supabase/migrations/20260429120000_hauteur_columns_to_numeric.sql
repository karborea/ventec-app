-- Permettre les valeurs décimales sur les hauteurs (ex. 55.45, 67.5).
ALTER TABLE public.ouvertures
  ALTER COLUMN hauteur_support_simple_po TYPE numeric(10, 2),
  ALTER COLUMN hauteur_support_haut_po TYPE numeric(10, 2),
  ALTER COLUMN hauteur_support_bas_po TYPE numeric(10, 2),
  ALTER COLUMN polymat_unique_hauteur_po TYPE numeric(10, 2),
  ALTER COLUMN polymat_haut_hauteur_po TYPE numeric(10, 2),
  ALTER COLUMN polymat_bas_hauteur_po TYPE numeric(10, 2),
  ALTER COLUMN longueur_totale_po TYPE numeric(10, 2);

COMMENT ON COLUMN public.ouvertures.hauteur_support_simple_po IS 'Pouces, décimales permises (2 décimales).';
COMMENT ON COLUMN public.ouvertures.hauteur_support_haut_po IS 'Pouces, décimales permises (2 décimales).';
COMMENT ON COLUMN public.ouvertures.hauteur_support_bas_po IS 'Pouces, décimales permises (2 décimales).';
COMMENT ON COLUMN public.ouvertures.polymat_unique_hauteur_po IS 'Pouces, décimales permises (2 décimales).';
COMMENT ON COLUMN public.ouvertures.polymat_haut_hauteur_po IS 'Pouces, décimales permises (2 décimales).';
COMMENT ON COLUMN public.ouvertures.polymat_bas_hauteur_po IS 'Pouces, décimales permises (2 décimales).';
COMMENT ON COLUMN public.ouvertures.longueur_totale_po IS 'Pouces, décimales permises (2 décimales). Utilisé comme "Hauteur de l''ouverture totale" pour rideau double.';
