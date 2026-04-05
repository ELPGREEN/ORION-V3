
-- ==========================================
-- PART 4: Add more missing columns
-- ==========================================

-- avaliacoes: add nome, depoimento, foto_url, aprovado, updated_at
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS nome TEXT DEFAULT '';
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS depoimento TEXT DEFAULT '';
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS aprovado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- document_drafts: add draft_key, edited_content, step
ALTER TABLE public.document_drafts ADD COLUMN IF NOT EXISTS draft_key TEXT DEFAULT '';
ALTER TABLE public.document_drafts ADD COLUMN IF NOT EXISTS edited_content TEXT DEFAULT '';
ALTER TABLE public.document_drafts ADD COLUMN IF NOT EXISTS step INTEGER DEFAULT 1;

-- generation_queue: add prompt, params, result, result_metadata, attempts, max_attempts, started_at
ALTER TABLE public.generation_queue ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE public.generation_queue ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.generation_queue ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE public.generation_queue ADD COLUMN IF NOT EXISTS result_metadata JSONB;
ALTER TABLE public.generation_queue ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.generation_queue ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.generation_queue ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Create missing functions
CREATE OR REPLACE FUNCTION public.is_client_owner(_user_id UUID, _client_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.client_profiles WHERE id = _client_profile_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_unread_count(_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER FROM public.chat_messages m
  JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE m.read_at IS NULL AND m.sender_id != _user_id
    AND (c.cliente_id = _user_id OR c.advogado_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id UUID, _function_name TEXT, _max_requests INTEGER DEFAULT 30, _window_minutes INTEGER DEFAULT 5)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_count integer; window_cutoff timestamptz;
BEGIN
  window_cutoff := now() - (_window_minutes || ' minutes')::interval;
  SELECT COALESCE(SUM(request_count), 0) INTO current_count FROM public.rate_limits
  WHERE user_id = _user_id AND function_name = _function_name AND window_start > window_cutoff;
  IF current_count >= _max_requests THEN RETURN false; END IF;
  INSERT INTO public.rate_limits (user_id, function_name, request_count, window_start) VALUES (_user_id, _function_name, 1, now());
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count INTEGER;
BEGIN DELETE FROM public.api_cache WHERE expires_at < now();
GET DIAGNOSTICS deleted_count = ROW_COUNT; RETURN deleted_count; END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count INTEGER;
BEGIN DELETE FROM public.document_locks WHERE expires_at < now();
GET DIAGNOSTICS deleted_count = ROW_COUNT; RETURN deleted_count; END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_embedding_cache()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count INTEGER;
BEGIN DELETE FROM public.query_embedding_cache WHERE expires_at < now();
GET DIAGNOSTICS deleted_count = ROW_COUNT; RETURN deleted_count; END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count INTEGER;
BEGIN DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 hour';
GET DIAGNOSTICS deleted_count = ROW_COUNT; RETURN deleted_count; END; $$;

-- View: available_advogados
CREATE OR REPLACE VIEW public.available_advogados AS
SELECT
  ec.user_id,
  ec.nome_escritorio AS nome,
  ec.oab,
  ec.telefone
FROM escritorio_config ec
JOIN user_roles ur ON ur.user_id = ec.user_id AND ur.role = 'advogado';
