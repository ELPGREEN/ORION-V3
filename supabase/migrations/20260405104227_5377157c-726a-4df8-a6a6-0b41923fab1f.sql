
-- 1. generated_documents: remove anon SELECT exposing PII
DROP POLICY IF EXISTS "Public can view doc for signature via id" ON public.generated_documents;
DROP POLICY IF EXISTS "Anon view doc for signature via token" ON public.generated_documents;

-- 2. signature_log: authenticated only
DROP POLICY IF EXISTS "Public can log signatures with valid data" ON public.signature_log;
DROP POLICY IF EXISTS "System can insert signature log" ON public.signature_log;
CREATE POLICY "Authenticated insert signature_log"
  ON public.signature_log FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IS NOT NULL
    AND signer_email IS NOT NULL
    AND signer_name IS NOT NULL
    AND signature_type IS NOT NULL
    AND signature_hash IS NOT NULL
    AND length(signature_hash) >= 32
  );

-- 3. newsletter: remove weak duplicate
DROP POLICY IF EXISTS "Anyone can subscribe with valid email" ON public.newsletter_subscribers;

-- 4. contacts: validate fields
DROP POLICY IF EXISTS "Public can submit contacts" ON public.contacts;
CREATE POLICY "Public can submit contacts validated"
  ON public.contacts FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL AND length(trim(name)) >= 2 AND length(name) <= 200
    AND email IS NOT NULL AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND message IS NOT NULL AND length(trim(message)) >= 5 AND length(message) <= 5000
  );

-- 5. iot_telemetry: restrict to authenticated with device validation
DROP POLICY IF EXISTS "Authenticated users can insert telemetry" ON public.iot_telemetry;
CREATE POLICY "Authenticated insert telemetry"
  ON public.iot_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (device_id IS NOT NULL AND topic IS NOT NULL);

-- 6. pro_bono_requests: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can insert pro_bono_requests" ON public.pro_bono_requests;
CREATE POLICY "Authenticated insert pro_bono_requests"
  ON public.pro_bono_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    nome IS NOT NULL AND length(trim(nome)) >= 2
    AND email IS NOT NULL AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

-- 7. Fix mutable search_path
CREATE OR REPLACE FUNCTION public.get_items_needing_embeddings(batch_limit integer DEFAULT 100)
  RETURNS TABLE(id uuid, title text, content text, source_type text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT nkb.id, nkb.title, nkb.content, nkb.source_type
  FROM neural_knowledge_base nkb
  WHERE nkb.embedding IS NULL
  ORDER BY nkb.created_at DESC
  LIMIT batch_limit;
$function$;

CREATE OR REPLACE FUNCTION public.count_items_needing_embeddings()
  RETURNS bigint
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT COUNT(*) FROM neural_knowledge_base WHERE embedding IS NULL;
$function$;
