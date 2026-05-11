-- When the original manufacturer is "autre" (non-Ventec), the client
-- enters the company name as free text. Null when manufacturier = Ventec.

ALTER TABLE public.soumissions
  ADD COLUMN manufacturier_autre_nom text;

COMMENT ON COLUMN public.soumissions.manufacturier_autre_nom IS
  'Nom de la compagnie quand manufacturier_origine = autre. Null pour Ventec.';
