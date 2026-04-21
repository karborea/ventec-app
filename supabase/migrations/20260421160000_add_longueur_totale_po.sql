ALTER TABLE public.ouvertures
  ADD COLUMN longueur_totale_po integer;

COMMENT ON COLUMN public.ouvertures.longueur_totale_po IS
  'Longueur de l''ouverture totale (po). Utilisé uniquement lorsque rideau_type = double ET rideau_grandeur = standard.';
