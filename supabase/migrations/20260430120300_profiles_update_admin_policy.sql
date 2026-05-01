-- Admin override: admins can update any profile (the role-guard
-- trigger still applies, so they're the only ones who can change
-- the role column).

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
