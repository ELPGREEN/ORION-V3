-- Remove ALL existing policies on pro_bono_requests to start clean
DROP POLICY IF EXISTS "Anyone can submit pro bono request" ON public.pro_bono_requests;
DROP POLICY IF EXISTS "Advogados can view pro bono requests" ON public.pro_bono_requests;
DROP POLICY IF EXISTS "Advogados can update pro bono requests" ON public.pro_bono_requests;
DROP POLICY IF EXISTS "Advogados can delete pro bono requests" ON public.pro_bono_requests;
DROP POLICY IF EXISTS "Advogados can manage pro bono requests" ON public.pro_bono_requests;

-- Recreate all as PERMISSIVE (default)
CREATE POLICY "anon_insert_pro_bono"
ON public.pro_bono_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "advogado_select_pro_bono"
ON public.pro_bono_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'advogado'::app_role));

CREATE POLICY "advogado_update_pro_bono"
ON public.pro_bono_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'advogado'::app_role));

CREATE POLICY "advogado_delete_pro_bono"
ON public.pro_bono_requests FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'advogado'::app_role));
