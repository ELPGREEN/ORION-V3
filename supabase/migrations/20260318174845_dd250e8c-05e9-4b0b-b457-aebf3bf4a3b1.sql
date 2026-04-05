-- C2: Restrict legal_embeddings to authenticated users only (remove anon access)
-- Previously allowed {anon, authenticated} which exposed 86K+ records with personal data
DROP POLICY IF EXISTS "Legal embeddings are publicly readable" ON public.legal_embeddings;

CREATE POLICY "Legal embeddings readable by authenticated users only"
ON public.legal_embeddings
FOR SELECT
TO authenticated
USING (true);

-- C3: Add user_id to signed_urls and restrict access
-- Previously any authenticated user could enumerate all signed URLs
ALTER TABLE public.signed_urls ADD COLUMN IF NOT EXISTS user_id uuid;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view signed URLs" ON public.signed_urls;
DROP POLICY IF EXISTS "Anyone can view signed_urls" ON public.signed_urls;
DROP POLICY IF EXISTS "Allow authenticated access to signed_urls" ON public.signed_urls;

-- Create ownership-based policies
CREATE POLICY "Users can view their own signed_urls"
ON public.signed_urls
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own signed_urls"
ON public.signed_urls
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own signed_urls"
ON public.signed_urls
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Service role full access for backend operations
CREATE POLICY "Service role full access to signed_urls"
ON public.signed_urls
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);