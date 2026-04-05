-- Enable pg_net extension for HTTP calls from cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to generate embeddings every hour
SELECT cron.schedule(
  'generate-embeddings-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://vdnzkbvlowwkmwkhnlvn.supabase.co/functions/v1/generate-embeddings',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnprYnZsb3d3a213a2hubHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDI5ODEsImV4cCI6MjA4NTkxODk4MX0.pJA_sRl9URKZnFES_QYJRAE33Crt2KXQcByqzSqgtqI"}'::jsonb,
      body := '{"batchSize": 30, "target": "both"}'::jsonb
    ) AS request_id;
  $$
);
