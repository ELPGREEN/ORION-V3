-- Cron job: auto-process embeddings every 10 minutes
SELECT cron.schedule(
  'auto-generate-embeddings-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dlwafedtlvbvuoaopvsl.supabase.co/functions/v1/generate-embeddings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk"}'::jsonb,
    body := '{"batchSize": 100, "target": "all"}'::jsonb
  ) AS request_id;
  $$
);

-- Cron job: auto-approve evolution proposals every hour
SELECT cron.schedule(
  'auto-approve-evolutions-hourly',
  '0 * * * *',
  $$
  UPDATE public.neural_evolution_proposals
  SET status = 'approved',
      approved_at = now()
  WHERE status = 'pending'
    AND created_at < now() - interval '1 hour';
  $$
);