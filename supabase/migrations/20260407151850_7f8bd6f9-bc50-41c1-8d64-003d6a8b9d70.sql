
-- Programa de afiliados por produto
CREATE TABLE public.affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_percent numeric(5,2) NOT NULL DEFAULT 30.00 CHECK (commission_percent > 0 AND commission_percent <= 80),
  cookie_days integer NOT NULL DEFAULT 30,
  auto_approve boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  allow_coupon boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Solicitações de afiliação
CREATE TABLE public.affiliate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, affiliate_user_id)
);

-- Vendas rastreadas por afiliado
CREATE TABLE public.affiliate_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES auth.users(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  order_id uuid REFERENCES public.orders(id),
  buyer_email text,
  amount_cents integer NOT NULL DEFAULT 0,
  commission_cents integer NOT NULL DEFAULT 0,
  tracking_type text NOT NULL DEFAULT 'link' CHECK (tracking_type IN ('link', 'coupon')),
  tracking_ref text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cupons de afiliado
CREATE TABLE public.affiliate_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  discount_percent numeric(5,2) DEFAULT 0,
  uses integer NOT NULL DEFAULT 0,
  max_uses integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Triggers updated_at
CREATE TRIGGER set_updated_at_affiliate_programs BEFORE UPDATE ON public.affiliate_programs
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- RLS
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_coupons ENABLE ROW LEVEL SECURITY;

-- affiliate_programs policies
CREATE POLICY "Anyone can view active programs" ON public.affiliate_programs FOR SELECT USING (is_active = true);
CREATE POLICY "Creator manages own programs" ON public.affiliate_programs FOR ALL USING (auth.uid() = creator_id);

-- affiliate_requests policies
CREATE POLICY "Affiliates can request" ON public.affiliate_requests FOR INSERT WITH CHECK (auth.uid() = affiliate_user_id);
CREATE POLICY "Affiliates see own requests" ON public.affiliate_requests FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "Creators see requests for their programs" ON public.affiliate_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliate_programs ap WHERE ap.id = program_id AND ap.creator_id = auth.uid())
);
CREATE POLICY "Creators update requests" ON public.affiliate_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.affiliate_programs ap WHERE ap.id = program_id AND ap.creator_id = auth.uid())
);

-- affiliate_sales policies
CREATE POLICY "Affiliates see own sales" ON public.affiliate_sales FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "Creators see sales of their products" ON public.affiliate_sales FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.creator_id = auth.uid())
);

-- affiliate_coupons policies
CREATE POLICY "Affiliates manage own coupons" ON public.affiliate_coupons FOR ALL USING (auth.uid() = affiliate_user_id);
CREATE POLICY "Creators see coupons for their programs" ON public.affiliate_coupons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliate_programs ap WHERE ap.id = program_id AND ap.creator_id = auth.uid())
);
