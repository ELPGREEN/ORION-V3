
-- Schedule cron jobs (extensions pg_cron and pg_net should already be enabled)

-- 1. Neural Auto-Learn: every 2 hours (at minute 15)
SELECT cron.schedule(
  'neural-auto-learn-cron',
  '15 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vdnzkbvlowwkmwkhnlvn.supabase.co/functions/v1/neural-auto-learn',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnprYnZsb3d3a213a2hubHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDI5ODEsImV4cCI6MjA4NTkxODk4MX0.pJA_sRl9URKZnFES_QYJRAE33Crt2KXQcByqzSqgtqI"}'::jsonb,
    body := '{"action": "full"}'::jsonb
  ) AS request_id;
  $$
);

-- 2. Auto-Evolution Cron: every 4 hours (at minute 30)
SELECT cron.schedule(
  'auto-evolution-cron',
  '30 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vdnzkbvlowwkmwkhnlvn.supabase.co/functions/v1/auto-evolution-cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnprYnZsb3d3a213a2hubHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDI5ODEsImV4cCI6MjA4NTkxODk4MX0.pJA_sRl9URKZnFES_QYJRAE33Crt2KXQcByqzSqgtqI"}'::jsonb,
    body := '{"time": "scheduled"}'::jsonb
  ) AS request_id;
  $$
);

-- 3. Auto-Ingestion Cron: every 6 hours (at minute 0)
SELECT cron.schedule(
  'auto-ingestion-cron',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vdnzkbvlowwkmwkhnlvn.supabase.co/functions/v1/auto-ingestion-cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnprYnZsb3d3a213a2hubHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDI5ODEsImV4cCI6MjA4NTkxODk4MX0.pJA_sRl9URKZnFES_QYJRAE33Crt2KXQcByqzSqgtqI"}'::jsonb,
    body := '{"time": "scheduled"}'::jsonb
  ) AS request_id;
  $$
);
