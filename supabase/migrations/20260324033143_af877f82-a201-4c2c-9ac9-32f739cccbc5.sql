
-- Drop old overly-permissive advogado policies on client_profiles
DROP POLICY IF EXISTS "Advogados can view all client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Advogados can insert client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Advogados can update client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Advogados can delete client profiles" ON public.client_profiles;

-- Advogados can only view clients they own (user_id) or are assigned to (advogado_id)
CREATE POLICY "Advogados can view own client profiles"
  ON public.client_profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'advogado'::app_role)
    AND (user_id = auth.uid() OR advogado_id = auth.uid())
  );

-- Advogados can only insert clients linked to themselves
CREATE POLICY "Advogados can insert own client profiles"
  ON public.client_profiles FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'advogado'::app_role)
    AND advogado_id = auth.uid()
  );

-- Advogados can only update their own clients
CREATE POLICY "Advogados can update own client profiles"
  ON public.client_profiles FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'advogado'::app_role)
    AND (user_id = auth.uid() OR advogado_id = auth.uid())
  );

-- Advogados can only delete their own clients
CREATE POLICY "Advogados can delete own client profiles"
  ON public.client_profiles FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'advogado'::app_role)
    AND (user_id = auth.uid() OR advogado_id = auth.uid())
  );

-- Also fix client_documents: advogados should only see docs of their own clients
DROP POLICY IF EXISTS "Advogados can manage client documents" ON public.client_documents;

CREATE POLICY "Advogados can manage own client documents"
  ON public.client_documents FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'advogado'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_profiles cp
      WHERE cp.id = client_documents.client_profile_id
      AND (cp.user_id = auth.uid() OR cp.advogado_id = auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'advogado'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_profiles cp
      WHERE cp.id = client_documents.client_profile_id
      AND (cp.user_id = auth.uid() OR cp.advogado_id = auth.uid())
    )
  );
