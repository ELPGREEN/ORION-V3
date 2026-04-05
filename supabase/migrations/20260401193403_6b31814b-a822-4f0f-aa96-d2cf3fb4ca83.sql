
CREATE TABLE public.local_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3b82f6',
  category TEXT DEFAULT 'outro' CHECK (category IN ('audiencia','prazo','reuniao','compromisso','outro')),
  recurrence TEXT,
  google_event_id TEXT,
  processo_id UUID,
  client_profile_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.local_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON public.local_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON public.local_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.local_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.local_events FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_local_events_user_start ON public.local_events(user_id, start_at);
CREATE INDEX idx_local_events_google ON public.local_events(google_event_id) WHERE google_event_id IS NOT NULL;

CREATE TRIGGER update_local_events_updated_at
  BEFORE UPDATE ON public.local_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
