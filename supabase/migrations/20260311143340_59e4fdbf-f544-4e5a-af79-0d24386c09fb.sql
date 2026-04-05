
-- Lawyer presence tracking
CREATE TABLE public.lawyer_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyer_presence ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read presence (clients need to check if lawyer is online)
CREATE POLICY "Authenticated users can read presence"
  ON public.lawyer_presence FOR SELECT TO authenticated
  USING (true);

-- Only the lawyer can update their own presence
CREATE POLICY "Users can manage own presence"
  ON public.lawyer_presence FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Secretary collected summaries from client conversations
CREATE TABLE public.secretary_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  summary text NOT NULL DEFAULT '',
  collected_info jsonb NOT NULL DEFAULT '{}',
  urgency text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.secretary_summaries ENABLE ROW LEVEL SECURITY;

-- Advogados can see all summaries
CREATE POLICY "Advogados can manage summaries"
  ON public.secretary_summaries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role))
  WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- Service role for edge function inserts
CREATE POLICY "Service role can manage summaries"
  ON public.secretary_summaries FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_lawyer_presence
  BEFORE UPDATE ON public.lawyer_presence
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_secretary_summaries
  BEFORE UPDATE ON public.secretary_summaries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
