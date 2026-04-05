-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'produtor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'afiliado';

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'brl',
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'draft',
  category TEXT,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Affiliate links table
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  hash TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(affiliate_user_id, product_id)
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  affiliate_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  affiliate_fee_cents INTEGER NOT NULL DEFAULT 0,
  creator_fee_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Affiliate commissions table
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User plans table
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'basico',
  ai_tokens_remaining INTEGER NOT NULL DEFAULT 10,
  features_enabled JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_products_creator ON public.products(creator_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_affiliate_links_hash ON public.affiliate_links(hash);
CREATE INDEX idx_affiliate_links_product ON public.affiliate_links(product_id);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_user_id);
CREATE INDEX idx_orders_product ON public.orders(product_id);
CREATE INDEX idx_affiliate_commissions_user ON public.affiliate_commissions(affiliate_user_id);
CREATE INDEX idx_user_plans_user ON public.user_plans(user_id);

-- Updated_at triggers
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_user_plans_updated_at BEFORE UPDATE ON public.user_plans FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- RLS: Products
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (status = 'active');
CREATE POLICY "Creators manage own products" ON public.products FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- RLS: Affiliate Links
CREATE POLICY "Affiliates see own links" ON public.affiliate_links FOR SELECT TO authenticated USING (affiliate_user_id = auth.uid());
CREATE POLICY "Affiliates create own links" ON public.affiliate_links FOR INSERT TO authenticated WITH CHECK (affiliate_user_id = auth.uid());

-- RLS: Orders
CREATE POLICY "Buyers see own orders" ON public.orders FOR SELECT TO authenticated USING (buyer_user_id = auth.uid());
CREATE POLICY "Service role manages orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS: Affiliate Commissions
CREATE POLICY "Affiliates see own commissions" ON public.affiliate_commissions FOR SELECT TO authenticated USING (affiliate_user_id = auth.uid());
CREATE POLICY "Service role manages commissions" ON public.affiliate_commissions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS: User Plans
CREATE POLICY "Users see own plan" ON public.user_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service role manages plans" ON public.user_plans FOR ALL TO service_role USING (true) WITH CHECK (true);