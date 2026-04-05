-- =====================================================
-- NEURAL NETWORK "CONEXÃO" - ARCHITECTURE EXPANSION
-- =====================================================

-- Table for neural network learning from interactions
CREATE TABLE public.neural_learning_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('document_generation', 'chat', 'search', 'feedback')),
    input_text TEXT NOT NULL,
    output_text TEXT,
    quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    feedback TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    learned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for neural network specializations (admin-configurable)
CREATE TABLE public.neural_specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('direito_civil', 'direito_penal', 'direito_trabalhista', 'direito_tributario', 'direito_familia', 'direito_consumidor', 'direito_empresarial', 'direito_previdenciario', 'custom')),
    training_data JSONB DEFAULT '[]'::jsonb,
    prompts JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    accuracy_score NUMERIC(3,2) DEFAULT 0,
    training_status TEXT DEFAULT 'pending' CHECK (training_status IN ('pending', 'training', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for AI provider configurations (multi-AI orchestration)
CREATE TABLE public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL UNIQUE CHECK (provider_name IN ('gemini', 'groq', 'anthropic', 'openai')),
    display_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    use_for JSONB DEFAULT '["documents", "chat", "search"]'::jsonb,
    fallback_to TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for knowledge base expansion (admin uploads)
CREATE TABLE public.neural_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('jurisprudencia', 'doutrina', 'legislacao', 'modelo_documento', 'custom')),
    source_reference TEXT,
    embedding vector(768),
    tags TEXT[] DEFAULT '{}',
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default AI providers
INSERT INTO public.ai_providers (provider_name, display_name, priority, use_for, fallback_to) VALUES
('gemini', 'Google Gemini', 1, '["documents", "chat", "search"]', 'groq'),
('groq', 'Groq (Llama)', 2, '["chat", "search"]', 'anthropic'),
('anthropic', 'Anthropic Claude', 3, '["documents", "chat"]', 'openai'),
('openai', 'OpenAI GPT', 4, '["documents", "chat", "search"]', null);

-- Enable RLS
ALTER TABLE public.neural_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neural_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neural_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies for neural_learning_data
CREATE POLICY "Service role can manage learning data"
ON public.neural_learning_data
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their own learning data"
ON public.neural_learning_data
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for neural_specializations
CREATE POLICY "Advogados can manage their specializations"
ON public.neural_specializations
FOR ALL
USING (has_role(auth.uid(), 'advogado'))
WITH CHECK (has_role(auth.uid(), 'advogado'));

-- RLS Policies for ai_providers
CREATE POLICY "Advogados can view and manage AI providers"
ON public.ai_providers
FOR ALL
USING (has_role(auth.uid(), 'advogado'))
WITH CHECK (has_role(auth.uid(), 'advogado'));

-- RLS Policies for neural_knowledge_base
CREATE POLICY "Advogados can manage knowledge base"
ON public.neural_knowledge_base
FOR ALL
USING (has_role(auth.uid(), 'advogado'))
WITH CHECK (has_role(auth.uid(), 'advogado'));

CREATE POLICY "Service role can access knowledge base"
ON public.neural_knowledge_base
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_neural_learning_updated_at
BEFORE UPDATE ON public.neural_learning_data
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_neural_specializations_updated_at
BEFORE UPDATE ON public.neural_specializations
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_ai_providers_updated_at
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_neural_knowledge_base_updated_at
BEFORE UPDATE ON public.neural_knowledge_base
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Index for semantic search on knowledge base
CREATE INDEX idx_neural_knowledge_base_embedding ON public.neural_knowledge_base 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function for hybrid search in knowledge base
CREATE OR REPLACE FUNCTION public.search_neural_knowledge(
    query_embedding vector(768),
    query_text text,
    match_count integer DEFAULT 10,
    semantic_weight double precision DEFAULT 0.7,
    keyword_weight double precision DEFAULT 0.3,
    filter_type text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    source_type text,
    source_reference text,
    tags text[],
    semantic_score double precision,
    keyword_score double precision,
    combined_score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.title,
        kb.content,
        kb.source_type,
        kb.source_reference,
        kb.tags,
        (1 - (kb.embedding <=> query_embedding))::FLOAT AS semantic_score,
        COALESCE(ts_rank(
            to_tsvector('portuguese', kb.title || ' ' || kb.content),
            plainto_tsquery('portuguese', query_text)
        ), 0)::FLOAT AS keyword_score,
        (
            semantic_weight * (1 - (kb.embedding <=> query_embedding)) +
            keyword_weight * COALESCE(ts_rank(
                to_tsvector('portuguese', kb.title || ' ' || kb.content),
                plainto_tsquery('portuguese', query_text)
            ), 0)
        )::FLOAT AS combined_score
    FROM public.neural_knowledge_base kb
    WHERE kb.is_processed = true
      AND (filter_type IS NULL OR kb.source_type = filter_type)
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;