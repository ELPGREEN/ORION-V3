-- A5: Fix honorarios_config - restrict active honorarios visibility to advogados only
-- Previously any authenticated user (including clients) could see all active fee configs
DROP POLICY IF EXISTS "Authenticated users can view active honorarios" ON public.honorarios_config;

CREATE POLICY "Advogados can view all active honorarios"
ON public.honorarios_config
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR (ativo = true AND has_role(auth.uid(), 'advogado'))
);

-- M3: Fix document_locks - restrict visibility to document owners only
-- Previously any authenticated user could see all document locks (who is editing what)
DROP POLICY IF EXISTS "Authenticated users can view locks" ON public.document_locks;

CREATE POLICY "Users can view locks on their own documents"
ON public.document_locks
FOR SELECT
TO authenticated
USING (
  locked_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.id = document_locks.document_id 
    AND d.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'advogado')
);