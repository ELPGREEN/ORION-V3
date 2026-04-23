-- Creation of missing tables to prevent dependency errors in earlier migrations
CREATE TABLE IF NOT EXISTS public.lovable_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL DEFAULT '',
  lovable_id TEXT,
  user_lovable_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lovable_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lovable_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lovable_id TEXT NOT NULL DEFAULT '',
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lovable_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lovable_webhook_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT, path TEXT, signature TEXT,
  payload JSONB, status INTEGER, response_body JSONB,
  error TEXT, received_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lovable_webhook_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.signed_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  file_path TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.signed_urls ENABLE ROW LEVEL SECURITY;
