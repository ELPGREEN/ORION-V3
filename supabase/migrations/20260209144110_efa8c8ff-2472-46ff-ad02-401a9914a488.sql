
-- Fix pro_bono_requests: DROP restrictive INSERT policy, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can submit pro bono request" ON public.pro_bono_requests;
CREATE POLICY "Anyone can submit pro bono request"
  ON public.pro_bono_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Fix notificacoes: DROP restrictive INSERT policy, recreate as PERMISSIVE  
DROP POLICY IF EXISTS "Service can insert notificacoes" ON public.notificacoes;
CREATE POLICY "Service can insert notificacoes"
  ON public.notificacoes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Fix avaliacoes: the INSERT policy is restrictive too
DROP POLICY IF EXISTS "Usuários podem criar suas avaliações" ON public.avaliacoes;
CREATE POLICY "Usuários podem criar suas avaliações"
  ON public.avaliacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Clientes can create their own review" ON public.avaliacoes;
CREATE POLICY "Clientes can create their own review"
  ON public.avaliacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix escritorio_config: the ALL policy is restrictive
DROP POLICY IF EXISTS "Users can manage their own escritorio config" ON public.escritorio_config;
CREATE POLICY "Users can manage their own escritorio config"
  ON public.escritorio_config
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix escritorio_config SELECT for service
DROP POLICY IF EXISTS "Service can read escritorio config" ON public.escritorio_config;
CREATE POLICY "Service can read escritorio config"
  ON public.escritorio_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix ai_metrics INSERT policy (currently restrictive with true check)
DROP POLICY IF EXISTS "Service role can insert metrics" ON public.ai_metrics;
CREATE POLICY "Service role can insert metrics"
  ON public.ai_metrics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Fix ai_metrics SELECT policy
DROP POLICY IF EXISTS "Advogados can view all metrics" ON public.ai_metrics;
CREATE POLICY "Advogados can view all metrics"
  ON public.ai_metrics
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role));

-- Fix legal_embeddings policies
DROP POLICY IF EXISTS "Legal embeddings are publicly readable" ON public.legal_embeddings;
CREATE POLICY "Legal embeddings are publicly readable"
  ON public.legal_embeddings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Only service role can insert embeddings" ON public.legal_embeddings;
CREATE POLICY "Only service role can insert embeddings"
  ON public.legal_embeddings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only service role can update embeddings" ON public.legal_embeddings;
CREATE POLICY "Only service role can update embeddings"
  ON public.legal_embeddings
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Fix api_cache policies
DROP POLICY IF EXISTS "Cache readable by system" ON public.api_cache;
CREATE POLICY "Cache readable by system"
  ON public.api_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Cache writable by system" ON public.api_cache;
CREATE POLICY "Cache writable by system"
  ON public.api_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Cache updatable by system" ON public.api_cache;
CREATE POLICY "Cache updatable by system"
  ON public.api_cache
  FOR UPDATE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Cache deletable by system" ON public.api_cache;
CREATE POLICY "Cache deletable by system"
  ON public.api_cache
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Fix query_embedding_cache policies
DROP POLICY IF EXISTS "Embedding cache readable by system" ON public.query_embedding_cache;
CREATE POLICY "Embedding cache readable by system"
  ON public.query_embedding_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Embedding cache writable by system" ON public.query_embedding_cache;
CREATE POLICY "Embedding cache writable by system"
  ON public.query_embedding_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Embedding cache updatable by system" ON public.query_embedding_cache;
CREATE POLICY "Embedding cache updatable by system"
  ON public.query_embedding_cache
  FOR UPDATE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Embedding cache deletable by system" ON public.query_embedding_cache;
CREATE POLICY "Embedding cache deletable by system"
  ON public.query_embedding_cache
  FOR DELETE
  TO anon, authenticated
  USING (true);
