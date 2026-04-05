-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can submit pro bono request" ON public.pro_bono_requests;

-- Recreate as PERMISSIVE
CREATE POLICY "Anyone can submit pro bono request"
ON public.pro_bono_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
