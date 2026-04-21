-- =====================================================
-- Ouvertures (opening details for a soumission)
-- =====================================================

CREATE TYPE public.materiau AS ENUM (
  'bois',
  'acier',
  'beton'
);

CREATE TYPE public.rideau_type AS ENUM (
  'simple',
  'double'
);

CREATE TABLE public.ouvertures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_id uuid NOT NULL REFERENCES public.soumissions(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 1,

  -- Dimensions (in inches)
  longueur_po integer,

  -- Materials
  materiau_haut public.materiau,
  materiau_bas public.materiau,

  -- Curtain type
  rideau_type public.rideau_type,

  -- Heights (in inches) — for simple use polymat_unique_hauteur_po;
  -- for double use polymat_haut_ + polymat_bas_ pair.
  polymat_unique_hauteur_po integer,
  polymat_haut_hauteur_po integer,
  polymat_bas_hauteur_po integer,

  -- Blowers
  souffleurs_count integer,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (soumission_id, order_index)
);

COMMENT ON TABLE public.ouvertures IS
  'Détail d''une ouverture pour une soumission. 1:N avec soumissions.';

CREATE INDEX ouvertures_soumission_id_idx ON public.ouvertures(soumission_id);

CREATE TRIGGER ouvertures_set_updated_at
  BEFORE UPDATE ON public.ouvertures
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS : access inherits from parent soumission's user_id
ALTER TABLE public.ouvertures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ouvertures_select_own"
  ON public.ouvertures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.soumissions s
    WHERE s.id = soumission_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "ouvertures_insert_own"
  ON public.ouvertures FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.soumissions s
    WHERE s.id = soumission_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "ouvertures_update_own"
  ON public.ouvertures FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.soumissions s
    WHERE s.id = soumission_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.soumissions s
    WHERE s.id = soumission_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "ouvertures_delete_own"
  ON public.ouvertures FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.soumissions s
    WHERE s.id = soumission_id AND s.user_id = auth.uid()
  ));
