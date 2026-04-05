-- Add fields for the public lawyer website/profile page
ALTER TABLE public.escritorio_config
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS areas_atuacao TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS site_ativo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Allow public read access for active lawyer sites (no auth required)
CREATE POLICY "Public can view active lawyer sites"
  ON public.escritorio_config
  FOR SELECT
  TO anon
  USING (site_ativo = true);