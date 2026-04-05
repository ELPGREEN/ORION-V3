
-- Orion Traces table for distributed tracing
CREATE TABLE public.orion_traces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  spans JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orion_traces_trace_id ON public.orion_traces(trace_id);
CREATE INDEX idx_orion_traces_user_id ON public.orion_traces(user_id);
CREATE INDEX idx_orion_traces_created_at ON public.orion_traces(created_at DESC);

ALTER TABLE public.orion_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own traces" ON public.orion_traces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own traces" ON public.orion_traces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own traces" ON public.orion_traces FOR DELETE USING (auth.uid() = user_id);

-- Webhook Subscriptions table
CREATE TABLE public.webhook_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_subs_user ON public.webhook_subscriptions(user_id);
CREATE INDEX idx_webhook_subs_event ON public.webhook_subscriptions(event_type);

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhooks" ON public.webhook_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own webhooks" ON public.webhook_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own webhooks" ON public.webhook_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own webhooks" ON public.webhook_subscriptions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
