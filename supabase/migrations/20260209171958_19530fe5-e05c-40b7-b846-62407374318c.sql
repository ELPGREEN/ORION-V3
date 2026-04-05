
-- ==============================================
-- BULK FIX: Restrict all user-data policies to TO authenticated
-- These policies all use auth.uid() so anon can never match anyway,
-- but explicitly restricting to authenticated is best practice.
-- ==============================================

-- ai_metrics
DROP POLICY IF EXISTS "Advogados can view all metrics" ON public.ai_metrics;
CREATE POLICY "Advogados can view all metrics" ON public.ai_metrics
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));

-- ai_providers
DROP POLICY IF EXISTS "Advogados can view and manage AI providers" ON public.ai_providers;
CREATE POLICY "Advogados can view and manage AI providers" ON public.ai_providers
FOR ALL TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role))
WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- avaliacoes (keep public read for approved, restrict rest to authenticated)
DROP POLICY IF EXISTS "Advogados can delete reviews" ON public.avaliacoes;
DROP POLICY IF EXISTS "Advogados can update reviews" ON public.avaliacoes;
DROP POLICY IF EXISTS "Advogados can view all reviews" ON public.avaliacoes;
DROP POLICY IF EXISTS "Advogados podem atualizar avaliações" ON public.avaliacoes;
DROP POLICY IF EXISTS "Advogados podem ver todas avaliações" ON public.avaliacoes;
DROP POLICY IF EXISTS "Clientes can delete their own review" ON public.avaliacoes;
DROP POLICY IF EXISTS "Clientes can update their own review" ON public.avaliacoes;
DROP POLICY IF EXISTS "Clientes can view their own review" ON public.avaliacoes;
DROP POLICY IF EXISTS "Usuários podem ver suas avaliações" ON public.avaliacoes;

CREATE POLICY "Advogados can delete reviews" ON public.avaliacoes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Advogados can update reviews" ON public.avaliacoes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Advogados can view all reviews" ON public.avaliacoes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Clientes can delete their own review" ON public.avaliacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Clientes can update their own review" ON public.avaliacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Clientes can view their own review" ON public.avaliacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- chat_conversations
DROP POLICY IF EXISTS "Clientes veem suas próprias conversas" ON public.chat_conversations;
DROP POLICY IF EXISTS "Participantes podem atualizar conversas" ON public.chat_conversations;
CREATE POLICY "Clientes veem suas próprias conversas" ON public.chat_conversations FOR SELECT TO authenticated USING ((cliente_id = auth.uid()) OR has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Participantes podem atualizar conversas" ON public.chat_conversations FOR UPDATE TO authenticated USING ((cliente_id = auth.uid()) OR has_role(auth.uid(), 'advogado'::app_role));

-- chat_messages
DROP POLICY IF EXISTS "Participantes podem marcar como lida" ON public.chat_messages;
DROP POLICY IF EXISTS "Participantes podem ver mensagens da conversa" ON public.chat_messages;
CREATE POLICY "Participantes podem marcar como lida" ON public.chat_messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = chat_messages.conversation_id AND (c.cliente_id = auth.uid() OR has_role(auth.uid(), 'advogado'::app_role))));
CREATE POLICY "Participantes podem ver mensagens da conversa" ON public.chat_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = chat_messages.conversation_id AND (c.cliente_id = auth.uid() OR has_role(auth.uid(), 'advogado'::app_role))));

-- client_documents
DROP POLICY IF EXISTS "Advogados can manage client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Clients can delete their own uploaded documents" ON public.client_documents;
DROP POLICY IF EXISTS "Clients can view their own documents" ON public.client_documents;
CREATE POLICY "Advogados can manage client documents" ON public.client_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role)) WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Clients can delete their own uploaded documents" ON public.client_documents FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_client_owner(auth.uid(), client_profile_id));
CREATE POLICY "Clients can view their own documents" ON public.client_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM client_profiles cp WHERE cp.id = client_documents.client_profile_id AND cp.user_id = auth.uid()));

-- consultas
DROP POLICY IF EXISTS "Advogados can update consultas" ON public.consultas;
DROP POLICY IF EXISTS "Advogados can view all consultas" ON public.consultas;
DROP POLICY IF EXISTS "Clientes can view their own consultas" ON public.consultas;
CREATE POLICY "Advogados can update consultas" ON public.consultas FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Advogados can view all consultas" ON public.consultas FOR SELECT TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Clientes can view their own consultas" ON public.consultas FOR SELECT TO authenticated USING (auth.uid() = cliente_id);

-- contact_documents
DROP POLICY IF EXISTS "Users can manage their own contact documents" ON public.contact_documents;
CREATE POLICY "Users can manage their own contact documents" ON public.contact_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- contacts
DROP POLICY IF EXISTS "Users can manage their own contacts" ON public.contacts;
CREATE POLICY "Users can manage their own contacts" ON public.contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- courtlistener_webhook_events
DROP POLICY IF EXISTS "Advogados can delete webhook events" ON public.courtlistener_webhook_events;
DROP POLICY IF EXISTS "Advogados can update webhook events" ON public.courtlistener_webhook_events;
DROP POLICY IF EXISTS "Advogados can view webhook events" ON public.courtlistener_webhook_events;
CREATE POLICY "Advogados can delete webhook events" ON public.courtlistener_webhook_events FOR DELETE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Advogados can update webhook events" ON public.courtlistener_webhook_events FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Advogados can view webhook events" ON public.courtlistener_webhook_events FOR SELECT TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));

-- document_drafts
DROP POLICY IF EXISTS "Users can manage their own drafts" ON public.document_drafts;
CREATE POLICY "Users can manage their own drafts" ON public.document_drafts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- document_folders
DROP POLICY IF EXISTS "Users can manage their own folders" ON public.document_folders;
CREATE POLICY "Users can manage their own folders" ON public.document_folders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- documents
DROP POLICY IF EXISTS "Clientes can view shared documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Clientes can view shared documents" ON public.documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM shared_documents sd WHERE sd.document_id = documents.id AND sd.shared_with = auth.uid()));
CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.documents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- escritorio_config
DROP POLICY IF EXISTS "Users can manage their own escritorio config" ON public.escritorio_config;
CREATE POLICY "Users can manage their own escritorio config" ON public.escritorio_config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- generation_queue
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.generation_queue;
CREATE POLICY "Users can view their own jobs" ON public.generation_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- honorarios_config
DROP POLICY IF EXISTS "Advogados can manage their own honorarios" ON public.honorarios_config;
DROP POLICY IF EXISTS "Authenticated users can view active honorarios" ON public.honorarios_config;
CREATE POLICY "Advogados can manage their own honorarios" ON public.honorarios_config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view active honorarios" ON public.honorarios_config FOR SELECT TO authenticated USING (ativo = true);

-- invoices
DROP POLICY IF EXISTS "Advogados can manage their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Clients can view their own invoices" ON public.invoices;
CREATE POLICY "Advogados can manage their own invoices" ON public.invoices FOR ALL TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role)) WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Clients can view their own invoices" ON public.invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM client_profiles cp WHERE cp.id = invoices.client_profile_id AND cp.user_id = auth.uid()));

-- neural_knowledge_base
DROP POLICY IF EXISTS "Advogados can manage knowledge base" ON public.neural_knowledge_base;
CREATE POLICY "Advogados can manage knowledge base" ON public.neural_knowledge_base FOR ALL TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role)) WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- neural_learning_data
DROP POLICY IF EXISTS "Users can view their own learning data" ON public.neural_learning_data;
CREATE POLICY "Users can view their own learning data" ON public.neural_learning_data FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- neural_specializations
DROP POLICY IF EXISTS "Advogados can manage their specializations" ON public.neural_specializations;
CREATE POLICY "Advogados can manage their specializations" ON public.neural_specializations FOR ALL TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role)) WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- notificacoes
DROP POLICY IF EXISTS "Users can delete their own notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can update their own notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can view their own notificacoes" ON public.notificacoes;
CREATE POLICY "Users can delete their own notificacoes" ON public.notificacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notificacoes" ON public.notificacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own notificacoes" ON public.notificacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- pro_bono_requests (advogado policies only - INSERT stays for anon+authenticated)
DROP POLICY IF EXISTS "advogado_delete_pro_bono" ON public.pro_bono_requests;
DROP POLICY IF EXISTS "advogado_select_pro_bono" ON public.pro_bono_requests;
DROP POLICY IF EXISTS "advogado_update_pro_bono" ON public.pro_bono_requests;
CREATE POLICY "advogado_delete_pro_bono" ON public.pro_bono_requests FOR DELETE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "advogado_select_pro_bono" ON public.pro_bono_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "advogado_update_pro_bono" ON public.pro_bono_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));

-- processo_documents
DROP POLICY IF EXISTS "Advogados can manage processo documents" ON public.processo_documents;
DROP POLICY IF EXISTS "Clients can view processo documents" ON public.processo_documents;
CREATE POLICY "Advogados can manage processo documents" ON public.processo_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role)) WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Clients can view processo documents" ON public.processo_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM processos p JOIN client_profiles cp ON cp.id = p.client_profile_id WHERE p.id = processo_documents.processo_id AND cp.user_id = auth.uid()));

-- processos
DROP POLICY IF EXISTS "Advogados can manage their own processos" ON public.processos;
DROP POLICY IF EXISTS "Clientes can view processos linked to them" ON public.processos;
CREATE POLICY "Advogados can manage their own processos" ON public.processos FOR ALL TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role) AND auth.uid() = user_id) WITH CHECK (has_role(auth.uid(), 'advogado'::app_role) AND auth.uid() = user_id);
CREATE POLICY "Clientes can view processos linked to them" ON public.processos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM client_profiles cp WHERE cp.id = processos.client_profile_id AND cp.user_id = auth.uid()));

-- publicacoes (keep public read for published articles)
DROP POLICY IF EXISTS "Advogados can manage their own articles" ON public.publicacoes;
CREATE POLICY "Advogados can manage their own articles" ON public.publicacoes FOR ALL TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role) AND auth.uid() = user_id) WITH CHECK (has_role(auth.uid(), 'advogado'::app_role) AND auth.uid() = user_id);

-- shared_documents
DROP POLICY IF EXISTS "Advogados can delete shared documents" ON public.shared_documents;
DROP POLICY IF EXISTS "Advogados can view all shared documents" ON public.shared_documents;
DROP POLICY IF EXISTS "Clientes can view shared documents" ON public.shared_documents;
CREATE POLICY "Advogados can delete shared documents" ON public.shared_documents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Advogados can view all shared documents" ON public.shared_documents FOR SELECT TO authenticated USING (has_role(auth.uid(), 'advogado'::app_role));
CREATE POLICY "Clientes can view shared documents" ON public.shared_documents FOR SELECT TO authenticated USING (auth.uid() = shared_with);

-- signature_envelopes
DROP POLICY IF EXISTS "Advogados can manage their own envelopes" ON public.signature_envelopes;
DROP POLICY IF EXISTS "Clientes can view envelopes they are signers on" ON public.signature_envelopes;
CREATE POLICY "Advogados can manage their own envelopes" ON public.signature_envelopes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clientes can view envelopes they are signers on" ON public.signature_envelopes FOR SELECT TO authenticated USING (auth.uid()::text IN (SELECT jsonb_array_elements_text(signers)));

-- tarefas
DROP POLICY IF EXISTS "Users can manage their own tarefas" ON public.tarefas;
CREATE POLICY "Users can manage their own tarefas" ON public.tarefas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
