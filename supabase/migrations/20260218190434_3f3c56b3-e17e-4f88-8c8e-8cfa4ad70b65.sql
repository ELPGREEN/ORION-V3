
-- ══════════════════════════════════════════════════════════════════
-- FINAL AUDIT — Missing triggers & event trigger
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────

-- Create function for auto-enabling RLS
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- 1. Create the rls_auto_enable EVENT TRIGGER
--    Automatically enables RLS on every new public table
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_event_trigger WHERE evtname = 'rls_auto_enable'
  ) THEN
    CREATE EVENT TRIGGER rls_auto_enable
      ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      EXECUTE FUNCTION public.rls_auto_enable();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 2. Add missing updated_at triggers
-- ─────────────────────────────────────────────────────────────────

-- shared_documents (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_documents' AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'shared_documents' AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER update_shared_documents_updated_at
      BEFORE UPDATE ON public.shared_documents
      FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;
END $$;

-- processo_documents (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'processo_documents' AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'processo_documents' AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER update_processo_documents_updated_at
      BEFORE UPDATE ON public.processo_documents
      FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;
END $$;

-- neural_ab_experiments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'neural_ab_experiments' AND NOT t.tgisinternal
  ) THEN
    -- neural_ab_experiments has no updated_at, skip
    NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 3. Add index on legal_embeddings for full-text search
--    (used by hybrid_search functions heavily)
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_legal_embeddings_fulltext
  ON public.legal_embeddings
  USING gin(to_tsvector('portuguese', title || ' ' || content));

-- ─────────────────────────────────────────────────────────────────
-- 4. Add index on neural_knowledge_base for full-text search
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_neural_knowledge_fulltext
  ON public.neural_knowledge_base
  USING gin(to_tsvector('portuguese', title || ' ' || content));

-- ─────────────────────────────────────────────────────────────────
-- 5. Add index on chat_ia_messages for conversation lookup
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_ia_messages_conversation_id
  ON public.chat_ia_messages(conversation_id);

-- ─────────────────────────────────────────────────────────────────
-- 6. Add index on chat_ia_conversations for user lookup
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_ia_conversations_user_id
  ON public.chat_ia_conversations(user_id);

-- ─────────────────────────────────────────────────────────────────
-- 7. Add index on consultas for client lookup
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consultas_cliente_id
  ON public.consultas(cliente_id);

-- ─────────────────────────────────────────────────────────────────
-- 8. Add index on avaliacoes for approved filter
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_avaliacoes_aprovado
  ON public.avaliacoes(aprovado)
  WHERE aprovado = true;
