CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  profile_data JSONB,
  scopes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON public.user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON public.user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.user_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON public.user_integrations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on user_integrations"
  ON public.user_integrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();