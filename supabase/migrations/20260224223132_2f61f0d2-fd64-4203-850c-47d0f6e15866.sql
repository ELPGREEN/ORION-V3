
SELECT cron.schedule(
  'neural-pipeline-orchestrator',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vdnzkbvlowwkmwkhnlvn.supabase.co/functions/v1/neural-pipeline-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnprYnZsb3d3a213a2hubHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDI5ODEsImV4cCI6MjA4NTkxODk4MX0.pJA_sRl9URKZnFES_QYJRAE33Crt2KXQcByqzSqgtqI"}'::jsonb,
    body := '{"action": "full_cycle"}'::jsonb
  ) AS request_id;
  $$
);
