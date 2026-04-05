-- Face auth enrollments table
CREATE TABLE public.face_auth_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  face_embedding_data jsonb NOT NULL DEFAULT '{}',
  reference_images text[] NOT NULL DEFAULT '{}',
  enrollment_quality numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  anti_spoof_config jsonb NOT NULL DEFAULT '{"liveness_required": true, "min_confidence": 0.75}',
  last_verified_at timestamptz,
  verification_count integer NOT NULL DEFAULT 0,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.face_auth_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own face enrollment"
  ON public.face_auth_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own face enrollment"
  ON public.face_auth_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own face enrollment"
  ON public.face_auth_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own face enrollment"
  ON public.face_auth_enrollments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.face_auth_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  confidence numeric,
  device_info jsonb,
  ip_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.face_auth_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own auth log"
  ON public.face_auth_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert logs"
  ON public.face_auth_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_face_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER face_auth_updated_at
  BEFORE UPDATE ON public.face_auth_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_face_auth_updated_at();