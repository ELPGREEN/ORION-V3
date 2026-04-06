CREATE TABLE public.voice_style_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_prompt text NOT NULL DEFAULT 'Fale de forma natural, clara e fluida em português brasileiro. Use um tom profissional mas amigável.',
  voice_name text NOT NULL DEFAULT 'Charon',
  speech_rate text DEFAULT 'normal',
  accent text DEFAULT 'neutro',
  tone text DEFAULT 'profissional',
  extra_instructions text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.voice_style_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own voice preferences"
  ON public.voice_style_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice preferences"
  ON public.voice_style_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice preferences"
  ON public.voice_style_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_voice_prefs_updated_at
  BEFORE UPDATE ON public.voice_style_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();