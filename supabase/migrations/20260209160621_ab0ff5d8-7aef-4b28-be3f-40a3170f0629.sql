
-- Fix api_cache: restrict to service_role only
DROP POLICY IF EXISTS "Cache deletable by system" ON public.api_cache;
DROP POLICY IF EXISTS "Cache readable by system" ON public.api_cache;
DROP POLICY IF EXISTS "Cache updatable by system" ON public.api_cache;
DROP POLICY IF EXISTS "Cache writable by system" ON public.api_cache;

CREATE POLICY "Cache readable by service" ON public.api_cache FOR SELECT USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Cache writable by service" ON public.api_cache FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Cache updatable by service" ON public.api_cache FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Cache deletable by service" ON public.api_cache FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Fix query_embedding_cache: restrict to service_role only
DROP POLICY IF EXISTS "Embedding cache deletable by system" ON public.query_embedding_cache;
DROP POLICY IF EXISTS "Embedding cache readable by system" ON public.query_embedding_cache;
DROP POLICY IF EXISTS "Embedding cache updatable by system" ON public.query_embedding_cache;
DROP POLICY IF EXISTS "Embedding cache writable by system" ON public.query_embedding_cache;

CREATE POLICY "Embedding cache readable by service" ON public.query_embedding_cache FOR SELECT USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Embedding cache writable by service" ON public.query_embedding_cache FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Embedding cache updatable by service" ON public.query_embedding_cache FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Embedding cache deletable by service" ON public.query_embedding_cache FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Fix legal_embeddings: restrict INSERT/UPDATE to service_role, keep SELECT public for search
DROP POLICY IF EXISTS "Only service role can insert embeddings" ON public.legal_embeddings;
DROP POLICY IF EXISTS "Only service role can update embeddings" ON public.legal_embeddings;

CREATE POLICY "Service role can insert embeddings" ON public.legal_embeddings FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Service role can update embeddings" ON public.legal_embeddings FOR UPDATE USING ((SELECT auth.role()) = 'service_role');

-- Fix neural_learning_data: restrict ALL to service_role
DROP POLICY IF EXISTS "Service role can manage learning data" ON public.neural_learning_data;

CREATE POLICY "Service role can manage learning data" ON public.neural_learning_data FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Service role can update learning data" ON public.neural_learning_data FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Service role can delete learning data" ON public.neural_learning_data FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Fix generation_queue: restrict service operations to service_role
DROP POLICY IF EXISTS "Service can delete jobs" ON public.generation_queue;
DROP POLICY IF EXISTS "Service can update jobs" ON public.generation_queue;

CREATE POLICY "Service role can update jobs" ON public.generation_queue FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Service role can delete jobs" ON public.generation_queue FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Fix courtlistener_webhook_events: restrict INSERT to service_role
DROP POLICY IF EXISTS "Service can insert webhook events" ON public.courtlistener_webhook_events;

CREATE POLICY "Service role can insert webhook events" ON public.courtlistener_webhook_events FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Fix notificacoes: restrict INSERT to service_role
DROP POLICY IF EXISTS "Service can insert notificacoes" ON public.notificacoes;

CREATE POLICY "Service role can insert notificacoes" ON public.notificacoes FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Fix escritorio_config: restrict service SELECT to service_role
DROP POLICY IF EXISTS "Service can read escritorio config" ON public.escritorio_config;

CREATE POLICY "Service role can read escritorio config" ON public.escritorio_config FOR SELECT USING ((SELECT auth.role()) = 'service_role');

-- Fix ai_metrics: restrict INSERT to service_role (was true)
DROP POLICY IF EXISTS "Service role can insert metrics" ON public.ai_metrics;

CREATE POLICY "Service role can insert metrics" ON public.ai_metrics FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Fix lovable_webhook_requests: enable proper RLS
-- CREATE POLICY "Service role full access webhook requests" ON public.lovable_webhook_requests FOR ALL USING ((SELECT auth.role()) = 'service_role') WITH CHECK ((SELECT auth.role()) = 'service_role');
