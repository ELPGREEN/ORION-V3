
-- ══════════════════════════════════════════════════════════════════
-- DATA INTEGRITY & PERFORMANCE — Round 5 (final)
-- ══════════════════════════════════════════════════════════════════

-- 1. Archive orphan processo
UPDATE public.processos
SET status = 'arquivado',
    descricao = COALESCE(descricao, '') || ' [Arquivado: sem cliente vinculado]'
WHERE id = '48122deb-ef7b-42f3-984e-708867a24d02'
  AND client_profile_id IS NULL;

-- 2. chat_messages FK (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chat_messages_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES public.chat_conversations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Performance indexes for RLS and frequent joins
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_with
  ON public.shared_documents(shared_with);

CREATE INDEX IF NOT EXISTS idx_shared_documents_document_id
  ON public.shared_documents(document_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
  ON public.chat_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_processos_client_profile_id
  ON public.processos(client_profile_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_id
  ON public.documents(user_id);

CREATE INDEX IF NOT EXISTS idx_documents_folder_id
  ON public.documents(folder_id);

CREATE INDEX IF NOT EXISTS idx_legal_embeddings_source
  ON public.legal_embeddings(source);

CREATE INDEX IF NOT EXISTS idx_legal_embeddings_content_type
  ON public.legal_embeddings(content_type);

CREATE INDEX IF NOT EXISTS idx_processo_documents_processo_id
  ON public.processo_documents(processo_id);

CREATE INDEX IF NOT EXISTS idx_andamentos_processo_id
  ON public.andamentos(processo_id);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_profile_id
  ON public.client_documents(client_profile_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_profile_id
  ON public.invoices(client_profile_id);

CREATE INDEX IF NOT EXISTS idx_generation_queue_status_user
  ON public.generation_queue(status, user_id);

CREATE INDEX IF NOT EXISTS idx_signature_envelopes_user_id
  ON public.signature_envelopes(user_id);
