
CREATE TABLE public.user_integration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  connected_email text,
  connected_name text,
  scopes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_integration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integration tokens"
  ON public.user_integration_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_integration_tokens_updated_at
  BEFORE UPDATE ON public.user_integration_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();
