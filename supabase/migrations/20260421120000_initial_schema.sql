-- =====================================================
-- Ventec — Initial schema
-- Tables : profiles, soumissions
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
CREATE TABLE IF NOT EXISTS public.profiles (
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

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- =====================================================
-- soumissions
-- =====================================================
CREATE TYPE public.soumission_type AS ENUM (
  'nouvelle_commande',
  'remplacement'
);

CREATE TYPE public.soumission_status AS ENUM (
  'brouillon',
  'soumis',
  'envoye',
  'accepte',
  'refuse'
);

CREATE TYPE public.soumission_model AS ENUM (
  'polymat_g3',
  'polymat_xl'
);

CREATE SEQUENCE public.soumissions_number_seq START WITH 100000;

CREATE TABLE public.soumissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soumission_number bigint NOT NULL DEFAULT nextval('public.soumissions_number_seq') UNIQUE,
  project_name text NOT NULL,
  type public.soumission_type NOT NULL,
  status public.soumission_status NOT NULL DEFAULT 'brouillon',
  model public.soumission_model,
  note_client text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

COMMENT ON TABLE public.soumissions IS
  'Soumissions (demandes de devis). Header seulement — le détail par ouverture vient dans une table séparée.';

CREATE INDEX soumissions_user_id_idx ON public.soumissions(user_id);
CREATE INDEX soumissions_status_idx ON public.soumissions(status);
CREATE INDEX soumissions_created_at_idx ON public.soumissions(created_at DESC);

CREATE TRIGGER soumissions_set_updated_at
  BEFORE UPDATE ON public.soumissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE public.soumissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soumissions_select_own"
  ON public.soumissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "soumissions_insert_own"
  ON public.soumissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "soumissions_update_own"
  ON public.soumissions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "soumissions_delete_own_drafts"
  ON public.soumissions FOR DELETE
  USING (auth.uid() = user_id AND status = 'brouillon');
