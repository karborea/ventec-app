-- =====================================================
-- Ventec — Initial schema
-- Tables : profiles, devis
-- =====================================================

-- -----------------------------------------------------
-- Helper: updated_at trigger
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- profiles
-- =====================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  company text,
  phone text,
  language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  billing_address jsonb,
  shipping_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Profil client, une ligne par auth.users. Créé automatiquement au signup via trigger.';

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on auth signup (reads raw_user_meta_data set via signUp options.data)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, company, phone, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'language', 'fr')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill for users who signed up before this migration
INSERT INTO public.profiles (id, first_name, last_name, company, phone, language)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'first_name', ''),
  COALESCE(raw_user_meta_data->>'last_name', ''),
  raw_user_meta_data->>'company',
  raw_user_meta_data->>'phone',
  COALESCE(raw_user_meta_data->>'language', 'fr')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- (Insert is handled by trigger; no app-level INSERT needed)


-- =====================================================
-- devis (soumissions)
-- =====================================================
CREATE TYPE public.devis_type AS ENUM (
  'nouvelle_commande',
  'remplacement'
);

CREATE TYPE public.devis_status AS ENUM (
  'brouillon',
  'soumis',
  'envoye',
  'accepte',
  'refuse'
);

CREATE TYPE public.devis_model AS ENUM (
  'polymat_g3',
  'polymat_xl'
);

-- Human-friendly sequential submission numbers (starts at 100000)
CREATE SEQUENCE public.devis_soumission_seq START WITH 100000;

CREATE TABLE public.devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soumission_number bigint NOT NULL DEFAULT nextval('public.devis_soumission_seq') UNIQUE,
  project_name text NOT NULL,
  type public.devis_type NOT NULL,
  status public.devis_status NOT NULL DEFAULT 'brouillon',
  model public.devis_model,
  note_client text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

COMMENT ON TABLE public.devis IS
  'Demande de devis (soumission). Header seulement — le détail par ouverture vient dans une table séparée.';

CREATE INDEX devis_user_id_idx ON public.devis(user_id);
CREATE INDEX devis_status_idx ON public.devis(status);
CREATE INDEX devis_created_at_idx ON public.devis(created_at DESC);

CREATE TRIGGER devis_set_updated_at
  BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devis_select_own"
  ON public.devis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "devis_insert_own"
  ON public.devis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "devis_update_own"
  ON public.devis FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "devis_delete_own_drafts"
  ON public.devis FOR DELETE
  USING (auth.uid() = user_id AND status = 'brouillon');
