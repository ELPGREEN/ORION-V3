
CREATE TABLE public.jules_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  subsystem TEXT,
  prompt TEXT NOT NULL,
  title TEXT,
  branch TEXT DEFAULT 'main',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','merged')),
  pr_url TEXT,
  pr_title TEXT,
  resolved BOOLEAN DEFAULT NULL,
  follow_up_count INTEGER DEFAULT 0,
  error_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.jules_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access jules_sessions"
  ON public.jules_sessions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read jules_sessions"
  ON public.jules_sessions FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_jules_sessions_updated_at
  BEFORE UPDATE ON public.jules_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
