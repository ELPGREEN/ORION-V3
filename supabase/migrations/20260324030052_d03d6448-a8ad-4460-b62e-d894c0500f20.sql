-- Neural profile per user (isolated, no cross-user access)
CREATE TABLE public.user_neural_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'cliente',
  num_layers integer NOT NULL DEFAULT 4,
  neurons_per_layer jsonb NOT NULL DEFAULT '[64, 128, 128, 64]'::jsonb,
  activation_functions jsonb NOT NULL DEFAULT '["relu","gelu","tanh","sigmoid"]'::jsonb,
  specializations jsonb NOT NULL DEFAULT '[]'::jsonb,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  bias_vectors jsonb NOT NULL DEFAULT '{}'::jsonb,
  learning_rate double precision NOT NULL DEFAULT 0.001,
  training_epochs integer NOT NULL DEFAULT 0,
  last_loss double precision,
  best_loss double precision,
  knowledge_neurons jsonb NOT NULL DEFAULT '[]'::jsonb,
  initialized_at timestamp with time zone NOT NULL DEFAULT now(),
  last_trained_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_neural_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own neural profile"
  ON public.user_neural_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access neural profiles"
  ON public.user_neural_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER set_updated_at_user_neural_profiles
  BEFORE UPDATE ON public.user_neural_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TABLE public.neural_training_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  neural_profile_id uuid NOT NULL REFERENCES public.user_neural_profiles(id) ON DELETE CASCADE,
  epoch integer NOT NULL,
  loss double precision,
  accuracy double precision,
  weights_delta jsonb,
  training_data_sample jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.neural_training_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training logs"
  ON public.neural_training_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access training log"
  ON public.neural_training_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);