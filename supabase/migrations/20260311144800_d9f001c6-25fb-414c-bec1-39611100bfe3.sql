
-- Trigger to auto-create notification for client when a new andamento is added
CREATE OR REPLACE FUNCTION public.notify_client_on_andamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_user_id uuid;
  v_processo_numero text;
  v_processo_tipo text;
BEGIN
  -- Get the client user_id and processo info
  SELECT cp.user_id, p.numero_processo, p.tipo
  INTO v_client_user_id, v_processo_numero, v_processo_tipo
  FROM processos p
  JOIN client_profiles cp ON cp.id = p.client_profile_id
  WHERE p.id = NEW.processo_id;

  -- Only create notification if we found a linked client
  IF v_client_user_id IS NOT NULL THEN
    INSERT INTO notificacoes (user_id, tipo, titulo, descricao, link, referencia_id, referencia_tipo)
    VALUES (
      v_client_user_id,
      'documento',
      '📋 Nova movimentação no processo',
      'Processo ' || COALESCE(v_processo_numero, '') || ' (' || COALESCE(v_processo_tipo, '') || '): ' || LEFT(NEW.descricao, 120),
      '/dashboard/processos',
      NEW.processo_id::text,
      'processo'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on andamentos table
DROP TRIGGER IF EXISTS trigger_notify_client_andamento ON public.andamentos;
CREATE TRIGGER trigger_notify_client_andamento
  AFTER INSERT ON public.andamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_andamento();

-- Also auto-notify client when a document is shared
CREATE OR REPLACE FUNCTION public.notify_client_on_shared_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doc_title text;
BEGIN
  SELECT title INTO v_doc_title FROM documents WHERE id = NEW.document_id;

  INSERT INTO notificacoes (user_id, tipo, titulo, descricao, link, referencia_id, referencia_tipo)
  VALUES (
    NEW.shared_with,
    'documento',
    '📄 Novo documento compartilhado',
    'O advogado compartilhou: ' || COALESCE(v_doc_title, 'documento'),
    '/dashboard/documentos',
    NEW.document_id::text,
    'documento'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_shared_document ON public.shared_documents;
CREATE TRIGGER trigger_notify_shared_document
  AFTER INSERT ON public.shared_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_shared_document();
