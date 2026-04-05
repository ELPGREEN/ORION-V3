
-- Remove old slow cron
SELECT cron.unschedule('generate-embeddings-hourly');

-- Create faster cron: every 2 minutes, batch of 50
SELECT cron.schedule(
  'generate-embeddings-fast',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://vdnzkbvlowwkmwkhnlvn.supabase.co/functions/v1/generate-embeddings',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnprYnZsb3d3a213a2hubHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDI5ODEsImV4cCI6MjA4NTkxODk4MX0.pJA_sRl9URKZnFES_QYJRAE33Crt2KXQcByqzSqgtqI"}'::jsonb,
      body := '{"batchSize": 50, "target": "legal"}'::jsonb
    ) AS request_id;
  $$
);
