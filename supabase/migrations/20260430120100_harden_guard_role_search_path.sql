-- Pin search_path on the role-guard trigger function (clears
-- the function_search_path_mutable advisor lint).

CREATE OR REPLACE FUNCTION public.tg_profiles_guard_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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
