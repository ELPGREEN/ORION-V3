
-- Table: voice_guest_sessions — logs non-owner voice interactions
CREATE TABLE public.voice_guest_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  guest_name TEXT NOT NULL DEFAULT 'Desconhecido',
  voice_features JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  messages JSONB DEFAULT '[]'::jsonb,
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for owner lookups
CREATE INDEX idx_voice_guest_sessions_owner ON public.voice_guest_sessions(owner_user_id);

-- Enable RLS
ALTER TABLE public.voice_guest_sessions ENABLE ROW LEVEL SECURITY;

-- Owner can see their own guest sessions
CREATE POLICY "Owner can view own guest sessions"
  ON public.voice_guest_sessions
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- System can insert guest sessions for any owner
CREATE POLICY "Authenticated can insert guest sessions"
  ON public.voice_guest_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Owner can update their own guest sessions
CREATE POLICY "Owner can update own guest sessions"
  ON public.voice_guest_sessions
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid());
