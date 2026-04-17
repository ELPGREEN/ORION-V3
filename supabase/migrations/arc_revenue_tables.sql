-- ═══ ARC-AGI-2 Revenue System Tables ═══

-- 1. Tabela de Receitas do Orion
CREATE TABLE IF NOT EXISTS orion_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'service', 'affiliate', 'api_sale', 'content', 'subscription'
  amount INTEGER NOT NULL, -- em centavos
  currency VARCHAR(10) DEFAULT 'brl',
  description TEXT,
  source VARCHAR(255), -- customer_id ou source do revenue
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'earned', 'paid', 'cancelled'
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 2. Tabela de Saques/Payouts
CREATE TABLE IF NOT EXISTS orion_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- em centavos
  currency VARCHAR(10) DEFAULT 'brl',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed'
  stripe_transfer_id VARCHAR(255),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 3. Stripe Connect Accounts (Owner)
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  stripe_account_id VARCHAR(255) NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Credit Transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID,
  amount INTEGER NOT NULL, -- em centavos
  type VARCHAR(50) NOT NULL, -- 'credit_added', 'credit_used', 'refund'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Promotional Credits
CREATE TABLE IF NOT EXISTS promotional_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  promo_code VARCHAR(50),
  initial_amount INTEGER NOT NULL,
  remaining_amount INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Service Transactions (paraCharge)
CREATE TABLE IF NOT EXISTS service_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  stripe_session_id VARCHAR(255),
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 7. Google Service Usage (monetização Google APIs)
CREATE TABLE IF NOT EXISTS google_service_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  price_cents INTEGER NOT NULL,
  google_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. User Trials (serviços gratuitos)
CREATE TABLE IF NOT EXISTS user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  remaining_free_services INTEGER DEFAULT 10,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_revenues_status ON orion_revenues(status);
CREATE INDEX IF NOT EXISTS idx_revenues_type ON orion_revenues(type);
CREATE INDEX IF NOT EXISTS idx_revenues_created ON orion_revenues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON orion_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON orion_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_user ON promotional_credits(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE orion_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE orion_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_transactions ENABLE ROW LEVEL SECURITY;

-- Policies de acesso
-- Owner (advogado) pode ver tudo
CREATE POLICY "owner_can_manage_revenues" ON orion_revenues
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('advogado', 'admin'))
  );

CREATE POLICY "owner_can_manage_payouts" ON orion_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('advogado', 'admin'))
  );

CREATE POLICY "owner_can_manage_stripe_accounts" ON stripe_connect_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('advogado', 'admin'))
  );

-- Usuários podem ver seus próprios créditos
CREATE POLICY "user_can_read_credits" ON credit_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_can_read_promos" ON promotional_credits
  FOR SELECT USING (user_id = auth.uid());

-- RPC function para adicionar créditos (chamada pelo sistema)
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_added_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se quem adiciona é admin/owner
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_added_by 
    AND role IN ('advogado', 'admin')
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem adicionar créditos';
  END IF;

  -- Inserir transação
  INSERT INTO credit_transactions (user_id, target_user_id, amount, type, description)
  VALUES (p_added_by, p_user_id, CAST(p_amount * 100 AS INTEGER), 'credit_added', p_reason);
END;
$$;