-- Admin can delete any soumission. Cascades to ouvertures and
-- soumission_files via existing FK ON DELETE CASCADE.
-- (Storage objects in the soumission-files bucket aren't cleaned
-- by this — that's a separate cleanup if needed.)

CREATE POLICY "soumissions_delete_admin"
  ON public.soumissions FOR DELETE
  USING (public.is_admin());

-- Admin RPC: all soumissions joined with submitter info (email,
-- name, company). Mirrors list_users_for_admin pattern.
CREATE OR REPLACE FUNCTION public.list_soumissions_for_admin()
RETURNS TABLE(
  id uuid,
  soumission_number bigint,
  project_name text,
  type public.soumission_type,
  status public.soumission_status,
  model public.soumission_model,
  user_id uuid,
  user_email text,
  user_first_name text,
  user_last_name text,
  user_company text,
  created_at timestamptz,
  updated_at timestamptz
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
    SELECT s.id, s.soumission_number, s.project_name, s.type, s.status,
           s.model, s.user_id, u.email::text, p.first_name, p.last_name,
           p.company, s.created_at, s.updated_at
    FROM public.soumissions s
    JOIN auth.users u ON u.id = s.user_id
    LEFT JOIN public.profiles p ON p.id = s.user_id
    ORDER BY s.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_soumissions_for_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_soumissions_for_admin() TO authenticated;
