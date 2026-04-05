
-- Replace overly permissive policy with authenticated-only access
DROP POLICY "Allow authenticated users to manage signed_urls" ON public.signed_urls;

CREATE POLICY "Authenticated users can read signed_urls"
ON public.signed_urls FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage signed_urls"
ON public.signed_urls FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
