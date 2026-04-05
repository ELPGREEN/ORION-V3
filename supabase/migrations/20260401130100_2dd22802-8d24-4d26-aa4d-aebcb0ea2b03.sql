-- Create face_templates table
CREATE TABLE IF NOT EXISTS public.face_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descriptor jsonb NOT NULL,
  quality_score double precision DEFAULT 0,
  device_info jsonb,
  lgpd_consent_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_template_per_user UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.face_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own template
CREATE POLICY "Users view own face template"
  ON public.face_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own template
CREATE POLICY "Users create own face template"
  ON public.face_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own template
CREATE POLICY "Users update own face template"
  ON public.face_templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own template
CREATE POLICY "Users delete own face template"
  ON public.face_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Admins manage all
CREATE POLICY "Admins manage face templates"
  ON public.face_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger
CREATE TRIGGER update_face_templates_updated_at
  BEFORE UPDATE ON public.face_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_face_templates_user_id ON public.face_templates(user_id);