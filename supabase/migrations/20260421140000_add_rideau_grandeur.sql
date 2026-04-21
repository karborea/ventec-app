-- When rideau_type is 'double', the client must also pick a size category.
-- 'standard' = fits Ventec's pre-configured double sizes.
-- 'hors_standard' = custom double that will need extra validation.

CREATE TYPE public.rideau_grandeur AS ENUM (
  'standard',
  'hors_standard'
);

ALTER TABLE public.ouvertures
  ADD COLUMN rideau_grandeur public.rideau_grandeur;

COMMENT ON COLUMN public.ouvertures.rideau_grandeur IS
  'Catégorie de grandeur pour les rideaux doubles. NULL pour les rideaux simples.';
