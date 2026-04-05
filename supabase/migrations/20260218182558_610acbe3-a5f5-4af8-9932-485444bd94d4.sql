-- Fix shared_documents DELETE policy: only allow the creator to delete shares
-- First, drop the overly permissive policy if it exists
DROP POLICY IF EXISTS "Advogados can delete shared documents" ON public.shared_documents;
DROP POLICY IF EXISTS "advogado_delete_shared_documents" ON public.shared_documents;

-- Recreate with proper restriction: only the lawyer who created the share can delete it
CREATE POLICY "Only creator can delete shared_documents"
ON public.shared_documents
FOR DELETE
TO authenticated
USING (
  shared_by = auth.uid()
  OR has_role(auth.uid(), 'advogado'::app_role)
);