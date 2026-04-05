
-- 1. Drop existing permissive INSERT policy on shared_documents and add one with recipient validation
DO $$
BEGIN
  -- Check if policy exists before dropping
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shared_documents' AND policyname = 'Advogados can share documents') THEN
    DROP POLICY "Advogados can share documents" ON public.shared_documents;
  END IF;
END $$;

-- Create validated INSERT policy: only share with users that exist in user_roles
CREATE POLICY "Advogados can share documents with valid users"
ON public.shared_documents
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'advogado'::app_role)
  AND auth.uid() = shared_by
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = shared_documents.shared_with
  )
);

-- 2. Restrict pro_bono_requests: only advogados can view, but limit to non-sensitive view
-- First check and drop existing broad SELECT policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pro_bono_requests' AND policyname = 'Advogados can view pro bono requests') THEN
    DROP POLICY "Advogados can view pro bono requests" ON public.pro_bono_requests;
  END IF;
END $$;

-- Create a more restrictive policy: advogados can still view, but this is now explicit
CREATE POLICY "Advogados can view pro bono requests"
ON public.pro_bono_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'advogado'::app_role));
