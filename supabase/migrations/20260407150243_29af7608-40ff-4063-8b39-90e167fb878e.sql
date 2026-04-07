ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS sales_page_content jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sales_page_published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS short_description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cover_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_price_cents integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS guarantee_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trailer_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS testimonials jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faq jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS name text DEFAULT NULL;