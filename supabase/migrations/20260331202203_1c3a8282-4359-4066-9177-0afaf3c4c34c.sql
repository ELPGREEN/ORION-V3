
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('loi','contract','mou','nda','other')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('prospect','sent','negotiating','closed','lost')),
  title TEXT,
  counterparty TEXT,
  country TEXT,
  value_cents BIGINT DEFAULT 0,
  probability INTEGER DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  sent_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own deals" ON public.deals
  FOR ALL TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE TRIGGER set_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Seed demo data
INSERT INTO public.deals (creator_id, type, status, title, counterparty, country, value_cents, probability, sent_at, closed_at) VALUES
('6699c758-cad4-4102-a606-eb68a333bbc6', 'loi', 'sent', 'LOI - Parceria Tecnológica', 'TechCorp Inc.', 'US', 25000000, 60, now() - interval '45 days', NULL),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'loi', 'negotiating', 'LOI - Distribuição EU', 'EuroDistrib GmbH', 'DE', 18000000, 75, now() - interval '30 days', NULL),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'contract', 'closed', 'Contrato SaaS Enterprise', 'Global Solutions Ltd', 'GB', 42000000, 100, now() - interval '60 days', now() - interval '10 days'),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'contract', 'closed', 'Contrato Licenciamento IA', 'AI Partners SA', 'BR', 15000000, 100, now() - interval '90 days', now() - interval '25 days'),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'nda', 'closed', 'NDA - Due Diligence M&A', 'Venture Capital Fund', 'US', 0, 100, now() - interval '20 days', now() - interval '15 days'),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'mou', 'negotiating', 'MoU - Joint Venture Asia', 'Pacific Holdings Co.', 'SG', 35000000, 40, now() - interval '15 days', NULL),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'loi', 'prospect', 'LOI - Expansão LATAM', 'LatAm Group SA', 'MX', 12000000, 30, now() - interval '5 days', NULL),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'contract', 'lost', 'Contrato Consultoria', 'Advisory Corp', 'US', 8000000, 0, now() - interval '80 days', NULL),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'loi', 'sent', 'LOI - Compliance GDPR', 'DataProtect EU', 'FR', 9500000, 55, now() - interval '10 days', NULL),
('6699c758-cad4-4102-a606-eb68a333bbc6', 'contract', 'negotiating', 'Contrato White-Label', 'BrandTech Inc.', 'US', 30000000, 65, now() - interval '22 days', NULL);
