-- Table to store Stripe Connect accounts for each advogado
CREATE TABLE public.stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL,
  onboarding_complete boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  business_type text DEFAULT 'individual',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(stripe_account_id)
);

ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advogados can manage own connect account"
  ON public.stripe_connect_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.stripe_connect_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();