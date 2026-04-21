ALTER TABLE public.ouvertures
  ADD COLUMN souffleurs_aux_deux_extremites boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ouvertures.souffleurs_aux_deux_extremites IS
  'TRUE si des souffleurs sont installés à gauche ET à droite de l''ouverture.';
