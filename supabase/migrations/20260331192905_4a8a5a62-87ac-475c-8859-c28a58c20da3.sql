-- plant_configurations
CREATE TABLE IF NOT EXISTS public.plant_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_type text NOT NULL,
  name text NOT NULL,
  base_investment numeric NOT NULL DEFAULT 0,
  operating_cost_per_ton numeric NOT NULL DEFAULT 0,
  revenue_per_ton numeric NOT NULL DEFAULT 0,
  default_capacity integer NOT NULL DEFAULT 100,
  max_capacity integer NOT NULL DEFAULT 1000,
  payback_months integer,
  roi_annual_pct numeric,
  co2_offset_per_ton numeric DEFAULT 0,
  energy_recovery_kwh numeric DEFAULT 0,
  certifications jsonb DEFAULT '[]'::jsonb,
  markets text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read plant configs" ON public.plant_configurations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage plant configs" ON public.plant_configurations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- feasibility_market_data
CREATE TABLE IF NOT EXISTS public.feasibility_market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  country text,
  material_type text NOT NULL,
  price_per_ton_usd numeric NOT NULL DEFAULT 0,
  demand_tons_year numeric,
  supply_gap_pct numeric,
  growth_rate_pct numeric,
  regulatory_notes text,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feasibility_market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read market data" ON public.feasibility_market_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage market data" ON public.feasibility_market_data FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS on existing feasibility_studies
ALTER TABLE public.feasibility_studies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feasibility_studies' AND policyname = 'Users manage own studies') THEN
    EXECUTE 'CREATE POLICY "Users manage own studies" ON public.feasibility_studies FOR ALL TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feasibility_studies' AND policyname = 'Admins read all studies') THEN
    EXECUTE 'CREATE POLICY "Admins read all studies" ON public.feasibility_studies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Triggers
DROP TRIGGER IF EXISTS set_updated_at_plant_configurations ON public.plant_configurations;
CREATE TRIGGER set_updated_at_plant_configurations BEFORE UPDATE ON public.plant_configurations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- SEED: Plant Configurations
INSERT INTO public.plant_configurations (plant_type, name, base_investment, operating_cost_per_ton, revenue_per_ton, default_capacity, max_capacity, payback_months, roi_annual_pct, co2_offset_per_ton, energy_recovery_kwh, certifications, markets) VALUES
('pyrolysis', 'ELP Pyrolysis Plant', 5687000, 80, 280, 350, 1000, 36, 28, 1.2, 850, '["ISO 14001","CE Mark","EU ETS Compliant"]'::jsonb, ARRAY['EU','USA','Asia','LATAM']),
('otr', 'ELP OTR Recycling Plant', 8000000, 35, 110, 150, 500, 48, 22, 0.8, 200, '["ISO 14001","ISO 9001","Mining Safety Cert"]'::jsonb, ARRAY['EU','USA','Australia','Africa']),
('tire-recycling', 'ELP Tire Recycling Plant', 5800000, 120, 350, 50, 200, 30, 35, 1.5, 1200, '["ISO 14001","CE Mark","REACH Compliant"]'::jsonb, ARRAY['EU','USA','Asia','MEA']);

-- SEED: Market Data
INSERT INTO public.feasibility_market_data (region, country, material_type, price_per_ton_usd, demand_tons_year, supply_gap_pct, growth_rate_pct, source) VALUES
('EU', 'Germany', 'crumb_rubber', 320, 850000, 15, 8.5, 'ETRMA 2025'),
('EU', 'Italy', 'carbon_black', 480, 420000, 22, 12, 'Smithers 2025'),
('EU', 'Spain', 'pyrolysis_oil', 520, 310000, 30, 15, 'CONCAWE 2025'),
('USA', 'United States', 'crumb_rubber', 290, 1200000, 18, 6, 'USTMA 2025'),
('USA', 'United States', 'carbon_black', 450, 680000, 20, 9, 'Smithers 2025'),
('USA', 'United States', 'steel_wire', 180, 950000, 10, 4, 'ISRI 2025'),
('Asia', 'China', 'crumb_rubber', 250, 3200000, 25, 14, 'CRIA 2025'),
('Asia', 'India', 'pyrolysis_oil', 480, 890000, 35, 18, 'ATMA 2025'),
('Asia', 'Japan', 'carbon_black', 510, 350000, 12, 5, 'JATMA 2025'),
('LATAM', 'Brazil', 'crumb_rubber', 270, 420000, 28, 11, 'ANIP 2025'),
('LATAM', 'Brazil', 'steel_wire', 160, 280000, 20, 7, 'ANIP 2025'),
('MEA', 'UAE', 'pyrolysis_oil', 550, 180000, 40, 22, 'Gulf Petrochemicals 2025');

-- SEED: Neural Knowledge
INSERT INTO public.neural_knowledge_base (title, content, source_type, source_reference, category, tags, is_processed, user_id) VALUES
('Metodologia ROI Plantas Reciclagem', 'ROI = (Receita - Custo Op.) / Investimento × 100. NPV taxa 10-12%. IRR 18-35%. Créditos carbono EUR 50-80/ton.', 'system_generated', 'orion:feasibility_roi', 'feasibility', ARRAY['roi','npv','irr'], true, '00000000-0000-0000-0000-000000000000'),
('Mercado Derivados Pneus', 'Crumb rubber USD 250-320/ton, carbon black USD 450-510/ton, óleo pirólise USD 480-550/ton.', 'system_generated', 'orion:feasibility_market', 'market_intelligence', ARRAY['mercado','pneus'], true, '00000000-0000-0000-0000-000000000000'),
('Framework Viabilidade', 'Localização, capacidade, projeção 5-10 anos, risco ±20%. Breakeven: pirólise 24-36m, OTR 36-48m.', 'system_generated', 'orion:feasibility_framework', 'feasibility', ARRAY['viabilidade'], true, '00000000-0000-0000-0000-000000000000'),
('Certificações Ambientais', 'ISO 14001/9001, CE Mark, REACH, EU ETS. Créditos carbono MDL/VCS EUR 50-80/ton.', 'system_generated', 'orion:feasibility_certs', 'compliance', ARRAY['certificacoes'], true, '00000000-0000-0000-0000-000000000000');

-- SEED: Neural Specializations
INSERT INTO public.neural_specializations (name, description, category, keywords, accuracy_score, is_active, user_id, status) VALUES
('Feasibility Analysis Expert', 'Viabilidade econômico-financeira para plantas de reciclagem.', 'feasibility', ARRAY['roi','npv','irr','payback'], 0.91, true, '00000000-0000-0000-0000-000000000000', 'active'),
('Market Intelligence Analyst', 'Mercado de derivados de pneus reciclados.', 'market_intelligence', ARRAY['mercado','precos','demanda'], 0.89, true, '00000000-0000-0000-0000-000000000000', 'active');