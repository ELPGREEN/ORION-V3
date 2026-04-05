-- Rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage rate limits
CREATE POLICY "Service role manages rate_limits"
ON public.rate_limits FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_user_fn_window 
ON public.rate_limits (user_id, function_name, window_start);

-- Cleanup function for expired windows
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Rate limit check function (returns true if allowed)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _function_name text,
  _max_requests integer DEFAULT 30,
  _window_minutes integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_cutoff timestamp with time zone;
BEGIN
  window_cutoff := now() - (_window_minutes || ' minutes')::interval;
  
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = _user_id
    AND function_name = _function_name
    AND window_start > window_cutoff;
  
  IF current_count >= _max_requests THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.rate_limits (user_id, function_name, request_count, window_start)
  VALUES (_user_id, _function_name, 1, now());
  
  RETURN true;
END;
$$;