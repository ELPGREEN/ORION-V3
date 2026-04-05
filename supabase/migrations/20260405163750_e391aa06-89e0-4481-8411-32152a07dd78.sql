
-- Orion Realtime Monitors
CREATE TABLE public.orion_realtime_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monitor_type TEXT NOT NULL CHECK (monitor_type IN ('news', 'market', 'legal', 'weather', 'custom')),
  title TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  check_interval_minutes INTEGER NOT NULL DEFAULT 30,
  alert_channel TEXT NOT NULL DEFAULT 'toast' CHECK (alert_channel IN ('toast', 'push', 'email', 'all')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orion_realtime_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own monitors" ON public.orion_realtime_monitors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_orion_monitors_updated_at
  BEFORE UPDATE ON public.orion_realtime_monitors
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Orion Realtime Alerts
CREATE TABLE public.orion_realtime_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monitor_id UUID REFERENCES public.orion_realtime_monitors(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orion_realtime_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts" ON public.orion_realtime_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_realtime_monitors_user ON public.orion_realtime_monitors(user_id, is_active);
CREATE INDEX idx_realtime_alerts_user ON public.orion_realtime_alerts(user_id, is_read);
CREATE INDEX idx_realtime_alerts_monitor ON public.orion_realtime_alerts(monitor_id);
