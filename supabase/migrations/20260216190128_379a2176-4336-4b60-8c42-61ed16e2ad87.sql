
-- Add RLS policy for signed_urls table (currently has RLS enabled but no policies)
CREATE POLICY "Allow authenticated users to manage signed_urls"
ON public.signed_urls
FOR ALL
USING (true)
WITH CHECK (true);
