
-- 1) Alter products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'digital_download';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url text;

-- 2) Customer access (created first since others reference it)
CREATE TABLE IF NOT EXISTS public.customer_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.customer_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_access' AND policyname = 'Users view own access') THEN
    CREATE POLICY "Users view own access" ON public.customer_access FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_access' AND policyname = 'Creators view product access') THEN
    CREATE POLICY "Creators view product access" ON public.customer_access FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.creator_id = auth.uid()));
  END IF;
END $$;

-- 3) Product files
CREATE TABLE IF NOT EXISTS public.product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size_bytes bigint,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_files' AND policyname = 'Creator manages product files') THEN
    CREATE POLICY "Creator manages product files" ON public.product_files FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.creator_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.creator_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_files' AND policyname = 'Buyers view product files') THEN
    CREATE POLICY "Buyers view product files" ON public.product_files FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.customer_access ca WHERE ca.product_id = product_files.product_id AND ca.user_id = auth.uid() AND ca.is_active = true));
  END IF;
END $$;

-- 4) Product modules
CREATE TABLE IF NOT EXISTS public.product_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  content_url text,
  content_type text DEFAULT 'video',
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_modules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_modules' AND policyname = 'Creator manages modules') THEN
    CREATE POLICY "Creator manages modules" ON public.product_modules FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.creator_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.creator_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_modules' AND policyname = 'Buyers view published modules') THEN
    CREATE POLICY "Buyers view published modules" ON public.product_modules FOR SELECT TO authenticated
      USING (is_published = true AND EXISTS (SELECT 1 FROM public.customer_access ca WHERE ca.product_id = product_modules.product_id AND ca.user_id = auth.uid() AND ca.is_active = true));
  END IF;
END $$;

-- 5) Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-files', 'product-files', false) ON CONFLICT DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Creators upload product files storage') THEN
    CREATE POLICY "Creators upload product files storage" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Creators delete product files storage') THEN
    CREATE POLICY "Creators delete product files storage" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth download product files') THEN
    CREATE POLICY "Auth download product files" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'product-files');
  END IF;
END $$;
