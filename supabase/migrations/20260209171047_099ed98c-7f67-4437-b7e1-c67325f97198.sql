-- Drop the restrictive ALL policy for advogados (it blocks anon INSERT)
DROP POLICY IF EXISTS "Advogados can manage pro bono requests" ON public.pro_bono_requests;

-- Recreate as separate policies for advogados (SELECT, UPDATE, DELETE only)
CREATE POLICY "Advogados can view pro bono requests"
ON public.pro_bono_requests
FOR SELECT
USING (has_role(auth.uid(), 'advogado'::app_role));

CREATE POLICY "Advogados can update pro bono requests"
ON public.pro_bono_requests
FOR UPDATE
USING (has_role(auth.uid(), 'advogado'::app_role));

CREATE POLICY "Advogados can delete pro bono requests"
ON public.pro_bono_requests
FOR DELETE
USING (has_role(auth.uid(), 'advogado'::app_role));
