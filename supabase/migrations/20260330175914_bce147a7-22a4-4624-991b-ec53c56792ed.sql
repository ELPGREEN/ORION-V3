-- Voice biometry enrollment table
CREATE TABLE public.voice_auth_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_features jsonb NOT NULL DEFAULT '{}',
  enrollment_quality numeric NOT NULL DEFAULT 0,
  sample_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz,
  verification_count integer NOT NULL DEFAULT 0,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Voice auth log
CREATE TABLE public.voice_auth_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  confidence numeric,
  device_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.voice_auth_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_auth_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own voice enrollment"
  ON public.voice_auth_enrollments FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own voice log"
  ON public.voice_auth_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice log"
  ON public.voice_auth_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER set_voice_auth_updated_at
  BEFORE UPDATE ON public.voice_auth_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();