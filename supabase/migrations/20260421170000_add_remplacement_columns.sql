-- =====================================================
-- Remplacement flow : add columns to soumissions + ouvertures
-- =====================================================

-- 1. Manufacturier d'origine on soumissions (only for type=remplacement)
CREATE TYPE public.manufacturier_origine AS ENUM (
  'ventec',
  'autre'
);

ALTER TABLE public.soumissions
  ADD COLUMN manufacturier_origine public.manufacturier_origine;

COMMENT ON COLUMN public.soumissions.manufacturier_origine IS
  'Manufacturier d''origine du rideau à remplacer. Null pour type=nouvelle_commande.';

-- 2. Ouvertures additions for remplacement
CREATE TYPE public.systeme_type AS ENUM (
  'simple',
  'double'
);

CREATE TYPE public.rideau_a_remplacer AS ENUM (
  'haut',
  'bas',
  'les_deux'
);

CREATE TYPE public.modele_polymat AS ENUM (
  'xl_a',
  'xl_b',
  'xl_c',
  'xl_d',
  'g3_e',
  'g3_f'
);

ALTER TABLE public.ouvertures
  ADD COLUMN systeme public.systeme_type,
  ADD COLUMN rideau_a_remplacer public.rideau_a_remplacer,
  ADD COLUMN hauteur_support_simple_po integer,
  ADD COLUMN hauteur_support_haut_po integer,
  ADD COLUMN hauteur_support_bas_po integer,
  ADD COLUMN modele_polymat public.modele_polymat,
  ADD COLUMN nb_cellules_simple integer,
  ADD COLUMN nb_cellules_haut integer,
  ADD COLUMN nb_cellules_bas integer;

COMMENT ON COLUMN public.ouvertures.systeme IS
  'Type de système existant (remplacement). Null pour nouvelle_commande.';
COMMENT ON COLUMN public.ouvertures.rideau_a_remplacer IS
  'Quel rideau remplacer (double seulement). Null si systeme=simple ou nouvelle_commande.';
COMMENT ON COLUMN public.ouvertures.modele_polymat IS
  'Modèle Polymat sélectionné (remplacement). Null pour nouvelle_commande.';
