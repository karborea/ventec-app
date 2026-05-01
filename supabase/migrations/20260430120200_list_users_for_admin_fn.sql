-- Admin-only RPC that returns profiles joined with auth.users.email.
-- Needed because admins can read profiles via RLS but not auth.users
-- directly — emails live there.

CREATE OR REPLACE FUNCTION public.list_users_for_admin()
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  company text,
  phone text,
  language text,
  role public.user_role,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT p.id, u.email::text, p.first_name, p.last_name, p.company,
           p.phone, p.language, p.role, p.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_users_for_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_users_for_admin() TO authenticated;
