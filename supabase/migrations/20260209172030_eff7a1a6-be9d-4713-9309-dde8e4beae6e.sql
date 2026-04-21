
-- Fix remaining policies still using TO PUBLIC

-- ai_metrics: service role insert (service_role bypasses RLS, so this is redundant but let's restrict)
DROP POLICY IF EXISTS "Service role can insert metrics" ON public.ai_metrics;

-- avaliacoes: duplicate old policy
DROP POLICY IF EXISTS "Todos podem ver avaliações aprovadas" ON public.avaliacoes;
DROP POLICY IF EXISTS "Usuários podem criar suas avaliações" ON public.avaliacoes;

-- chat_conversations: create policy
DROP POLICY IF EXISTS "Clientes podem criar conversas" ON public.chat_conversations;
CREATE POLICY "Clientes podem criar conversas" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (cliente_id = auth.uid());

-- api_cache, query_embedding_cache, generation_queue, neural_learning_data, legal_embeddings, lovable tables: service_role policies
-- Service role BYPASSES RLS entirely, so these policies are redundant. Remove them.
DROP POLICY IF EXISTS "Cache deletable by service" ON public.api_cache;
DROP POLICY IF EXISTS "Cache readable by service" ON public.api_cache;
DROP POLICY IF EXISTS "Cache updatable by service" ON public.api_cache;
DROP POLICY IF EXISTS "Cache writable by service" ON public.api_cache;

DROP POLICY IF EXISTS "Embedding cache deletable by service" ON public.query_embedding_cache;
DROP POLICY IF EXISTS "Embedding cache readable by service" ON public.query_embedding_cache;
DROP POLICY IF EXISTS "Embedding cache updatable by service" ON public.query_embedding_cache;
DROP POLICY IF EXISTS "Embedding cache writable by service" ON public.query_embedding_cache;

DROP POLICY IF EXISTS "Service role can delete jobs" ON public.generation_queue;
DROP POLICY IF EXISTS "Service role can update jobs" ON public.generation_queue;

DROP POLICY IF EXISTS "Service role can delete learning data" ON public.neural_learning_data;
DROP POLICY IF EXISTS "Service role can manage learning data" ON public.neural_learning_data;
DROP POLICY IF EXISTS "Service role can update learning data" ON public.neural_learning_data;

DROP POLICY IF EXISTS "Service role can insert embeddings" ON public.legal_embeddings;
DROP POLICY IF EXISTS "Service role can update embeddings" ON public.legal_embeddings;

DROP POLICY IF EXISTS "Service role can access knowledge base" ON public.neural_knowledge_base;

-- DROP POLICY IF EXISTS "Service role full access webhook requests" ON public.lovable_webhook_requests;

-- Users can insert their own jobs (restrict to authenticated)
DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.generation_queue;
CREATE POLICY "Users can insert their own jobs" ON public.generation_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Clients can insert their own documents (restrict to authenticated)
DROP POLICY IF EXISTS "Clients can insert their own documents" ON public.client_documents;
CREATE POLICY "Clients can insert their own documents" ON public.client_documents FOR INSERT TO authenticated WITH CHECK (is_client_owner(auth.uid(), client_profile_id) AND auth.uid() = user_id);

-- Users can create their own documents (restrict to authenticated)
DROP POLICY IF EXISTS "Users can create their own documents" ON public.documents;
CREATE POLICY "Users can create their own documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can insert their own notificacoes (restrict to authenticated)
DROP POLICY IF EXISTS "Users can insert their own notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Service role can insert notificacoes" ON public.notificacoes;
CREATE POLICY "Users can insert their own notificacoes" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Consultas insert (restrict to authenticated)
DROP POLICY IF EXISTS "Clientes can create consultas" ON public.consultas;
CREATE POLICY "Clientes can create consultas" ON public.consultas FOR INSERT TO authenticated WITH CHECK (auth.uid() = cliente_id);

-- Clientes podem enviar mensagens (restrict to authenticated)
DROP POLICY IF EXISTS "Participantes podem enviar mensagens" ON public.chat_messages;
CREATE POLICY "Participantes podem enviar mensagens" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = chat_messages.conversation_id AND (c.cliente_id = auth.uid() OR has_role(auth.uid(), 'advogado'::app_role))));

-- lovable_users (restrict to authenticated)
DROP POLICY IF EXISTS "lovable_users_delete_own" ON public.lovable_users;
DROP POLICY IF EXISTS "lovable_users_select_own" ON public.lovable_users;
DROP POLICY IF EXISTS "lovable_users_update_own" ON public.lovable_users;
DROP POLICY IF EXISTS "lovable_users_insert_for_self" ON public.lovable_users;
CREATE POLICY "lovable_users_select_own" ON public.lovable_users FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "lovable_users_insert_for_self" ON public.lovable_users FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lovable_users_update_own" ON public.lovable_users FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "lovable_users_delete_own" ON public.lovable_users FOR DELETE TO authenticated USING (user_id = auth.uid());

-- lovable_events (restrict to authenticated)
DROP POLICY IF EXISTS "lovable_events_select_by_owner" ON public.lovable_events;
CREATE POLICY "lovable_events_select_by_owner" ON public.lovable_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM lovable_users lu WHERE lu.lovable_id IS NOT NULL AND lu.lovable_id = lovable_events.lovable_id AND lu.user_id = auth.uid()));

-- courtlistener webhook insert (service role bypasses, remove)
DROP POLICY IF EXISTS "Service role can insert webhook events" ON public.courtlistener_webhook_events;
