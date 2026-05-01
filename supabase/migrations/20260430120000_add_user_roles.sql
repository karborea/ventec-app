-- =====================================================
-- Ventec — User roles (client / admin)
-- Adds the role concept so future admin tooling has the
-- foundation: enum, profiles.role column, is_admin() helper,
-- guard trigger preventing self-promotion, and admin-override
-- RLS policies on the existing tables.
-- =====================================================

-- -----------------------------------------------------
-- Enum
-- -----------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('client', 'admin');

-- -----------------------------------------------------
-- profiles.role
-- -----------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN role public.user_role NOT NULL DEFAULT 'client';

CREATE INDEX profiles_role_idx ON public.profiles(role);

-- -----------------------------------------------------
-- is_admin() — SECURITY DEFINER so it can be called from
-- other tables' RLS policies without those policies needing
-- their own SELECT permission on profiles.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- -----------------------------------------------------
-- Guard trigger: only admins (or service_role / direct
-- postgres access where auth.uid() is null) can change a
-- profile's role. RLS on profiles only restricts WHICH row
-- a user can update; this restricts WHICH columns.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_profiles_guard_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change profile roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role ON public.profiles;
CREATE TRIGGER profiles_guard_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_guard_role();

-- -----------------------------------------------------
-- Admin-override RLS policies (additive — client policies
-- from the initial schema remain in place).
-- -----------------------------------------------------

-- profiles
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- soumissions
CREATE POLICY "soumissions_select_admin"
  ON public.soumissions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "soumissions_update_admin"
  ON public.soumissions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ouvertures
CREATE POLICY "ouvertures_select_admin"
  ON public.ouvertures FOR SELECT
  USING (public.is_admin());

-- soumission_files (table)
CREATE POLICY "soumission_files_select_admin"
  ON public.soumission_files FOR SELECT
  USING (public.is_admin());

-- soumission-files bucket (storage)
CREATE POLICY "soumission_files_storage_select_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'soumission-files' AND public.is_admin()
  );

-- -----------------------------------------------------
-- Bootstrap: promote the first admin manually via the
-- Supabase SQL editor (runs as postgres, bypasses the guard
-- trigger because auth.uid() is null):
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE id = '<auth.users.id>';
-- -----------------------------------------------------
