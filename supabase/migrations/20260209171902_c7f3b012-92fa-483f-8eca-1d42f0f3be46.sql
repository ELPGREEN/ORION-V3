
-- ==============================================
-- 1. FIX: escritorio_config - restrict Service role SELECT to authenticated only
-- ==============================================
DROP POLICY IF EXISTS "Service role can read escritorio config" ON public.escritorio_config;

-- Service role always bypasses RLS, so that policy was redundant.
-- The "Users can manage their own escritorio config" policy (TO authenticated) is sufficient.
-- No anonymous access needed.

-- ==============================================
-- 2. FIX: client_profiles - restrict policies TO authenticated only
-- ==============================================
DROP POLICY IF EXISTS "Advogados can insert client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Advogados can update client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Advogados can view all client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Clientes can insert their own profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Clientes can update their own profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Clientes can view their own profile" ON public.client_profiles;

CREATE POLICY "Advogados can insert client profiles" ON public.client_profiles
FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

CREATE POLICY "Advogados can update client profiles" ON public.client_profiles
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));

CREATE POLICY "Advogados can view all client profiles" ON public.client_profiles
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));

CREATE POLICY "Clientes can insert their own profile" ON public.client_profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clientes can update their own profile" ON public.client_profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Clientes can view their own profile" ON public.client_profiles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ==============================================
-- 3. FIX: trigger_set_updated_at - set search_path
-- ==============================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==============================================
-- 4. FIX: foreign table "wrapper" - revoke API access
-- ==============================================
REVOKE ALL ON public.wrapper FROM anon, authenticated;

-- ==============================================
-- 5. FIX: RLS "WITH CHECK (true)" - restrict pro_bono INSERT to specific roles
-- (Already permissive but explicitly scoped to anon+authenticated, which is correct for a public form)
-- No change needed - already fixed in previous migration with TO anon, authenticated
-- ==============================================
