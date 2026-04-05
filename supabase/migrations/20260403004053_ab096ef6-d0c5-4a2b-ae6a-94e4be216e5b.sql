
CREATE TABLE public.user_google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  connected_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Google tokens"
  ON public.user_google_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google tokens"
  ON public.user_google_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google tokens"
  ON public.user_google_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google tokens"
  ON public.user_google_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_google_tokens_updated_at
  BEFORE UPDATE ON public.user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
