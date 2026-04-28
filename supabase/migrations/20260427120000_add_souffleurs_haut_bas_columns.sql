ALTER TABLE public.ouvertures
  ADD COLUMN IF NOT EXISTS souffleurs_count_haut integer,
  ADD COLUMN IF NOT EXISTS souffleurs_count_bas integer;

COMMENT ON COLUMN public.ouvertures.souffleurs_count_haut IS 'Remplacement systeme double : souffleurs côté haut. NULL pour simple ou nouvelle commande.';
COMMENT ON COLUMN public.ouvertures.souffleurs_count_bas IS 'Remplacement systeme double : souffleurs côté bas. NULL pour simple ou nouvelle commande.';
