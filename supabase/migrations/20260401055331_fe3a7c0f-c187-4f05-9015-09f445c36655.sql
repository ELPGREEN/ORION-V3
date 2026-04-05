-- Fix 4 tables with RLS enabled but NO policies

CREATE POLICY "Users view own signed_urls"
  ON public.signed_urls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own signed_urls"
  ON public.signed_urls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view lovable_events"
  ON public.lovable_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins view lovable_users"
  ON public.lovable_users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins view lovable_webhook_requests"
  ON public.lovable_webhook_requests FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));