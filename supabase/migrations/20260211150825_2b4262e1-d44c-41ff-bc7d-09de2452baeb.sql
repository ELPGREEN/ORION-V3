
-- RLS policies for api_cache
CREATE POLICY "Advogados can view api_cache"
ON public.api_cache
FOR SELECT
USING (has_role(auth.uid(), 'advogado'::app_role));

-- RLS policies for query_embedding_cache
CREATE POLICY "Advogados can view query_embedding_cache"
ON public.query_embedding_cache
FOR SELECT
USING (has_role(auth.uid(), 'advogado'::app_role));

-- RLS policies for lovable_webhook_requests
CREATE POLICY "Advogados can view lovable_webhook_requests"
ON public.lovable_webhook_requests
FOR SELECT
USING (has_role(auth.uid(), 'advogado'::app_role));
