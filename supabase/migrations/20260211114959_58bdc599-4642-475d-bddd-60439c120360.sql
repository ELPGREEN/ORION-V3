UPDATE public.ai_providers
SET use_for = '["chat", "search", "documents"]'::jsonb
WHERE provider_name = 'groq';